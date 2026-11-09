// src/main.rs
mod api;
mod types;

use std::io;
use std::time::Duration;

use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use ratatui::{
    Terminal,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph},
};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, de::DeserializeOwned};
use tokio;

#[derive(Debug, Clone, Deserialize)]
struct PokedexEntry {
    id: u32,
    name: String,
}

#[derive(Debug, Clone, Deserialize)]
struct Ability {
    name: String,
    flavour_text: String,
    effect: String,
}

#[derive(Debug, Clone, Deserialize)]
struct PokemonSprites {
    front_default: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct PokeboxEntry {
    id: u32,
    name: String,
    /// English form name ("Alolan Form"); empty for most default forms.
    /// Defaulted so servers that predate forms still work.
    #[serde(default)]
    form_name: String,
    species_description: String,
    types: Vec<String>,
    abilities: Vec<Ability>,
    sprites: PokemonSprites,
    /// The species' other forms, never this one.
    #[serde(default)]
    varieties: Vec<PokemonVariety>,
}

/// Another form of a Pokémon's species (Alolan, Mega, ...).
#[derive(Debug, Clone, Deserialize)]
struct PokemonVariety {
    id: u32,
    name: String,
    form_name: String,
    is_default: bool,
    species_description: String,
    types: Vec<String>,
    abilities: Vec<Ability>,
}

/// One form the details pane can show: the Pokémon itself or one of its varieties.
#[derive(Debug, Clone)]
struct Form<'a> {
    id: u32,
    label: String,
    species_description: &'a str,
    types: &'a [String],
    abilities: &'a [Ability],
}

/// A form's label: its form name, else "Default Form" or its name, like the web clients.
fn form_label(name: &str, form_name: &str, is_default: bool) -> String {
    if !form_name.is_empty() {
        form_name.to_string()
    } else if is_default {
        "Default Form".to_string()
    } else {
        name.replace(['-', '_'], " ")
    }
}

/// Every form of the entry's species, the default form first and the rest
/// in the server's order.
fn forms(entry: &PokeboxEntry) -> Vec<Form<'_>> {
    // The entry is the default form unless one of its varieties is.
    let entry_is_default = !entry.varieties.iter().any(|v| v.is_default);
    let mut forms: Vec<(bool, Form)> = vec![(
        entry_is_default,
        Form {
            id: entry.id,
            label: form_label(&entry.name, &entry.form_name, entry_is_default),
            species_description: &entry.species_description,
            types: &entry.types,
            abilities: &entry.abilities,
        },
    )];
    forms.extend(entry.varieties.iter().map(|v| {
        (
            v.is_default,
            Form {
                id: v.id,
                label: form_label(&v.name, &v.form_name, v.is_default),
                species_description: &v.species_description,
                types: &v.types,
                abilities: &v.abilities,
            },
        )
    }));
    // Stable, so the non-default forms keep the server's order.
    forms.sort_by_key(|(is_default, _)| !is_default);
    forms.into_iter().map(|(_, form)| form).collect()
}

/// The details pane text for `entry`, showing the form at `form_index`.
fn details_text(entry: &PokeboxEntry, form_index: usize) -> String {
    let forms = forms(entry);
    let form = &forms[form_index % forms.len()];
    let switcher = if forms.len() > 1 {
        let labels: Vec<String> = forms
            .iter()
            .map(|f| if f.id == form.id { format!("[{}]", f.label) } else { f.label.clone() })
            .collect();
        format!("\nForms: {}  (f to switch)\n", labels.join("  "))
    } else {
        String::new()
    };
    format!(
        "#{} {}\n{}\n{}\n\nTypes: {}\n\nAbilities:\n{}",
        entry.id,
        entry.name,
        switcher,
        form.species_description,
        form.types.join(", "),
        form.abilities
            .iter()
            .map(|a| format!("- {}: {}", a.name, a.flavour_text))
            .collect::<Vec<_>>()
            .join("\n")
    )
}

const BACKEND_URL: &str = "http://localhost:3000";

/// Why a request to the backend failed. The statuses follow rust-server:
/// 404 the Pokémon doesn't exist, 502 PokeAPI failed, 500 MongoDB failed.
#[derive(Debug)]
enum FetchError {
    NotFound,
    Upstream,
    Server(StatusCode),
    BadResponse(reqwest::Error),
    Unreachable,
}

impl FetchError {
    /// What to tell the user, for a failure that isn't a missing Pokémon.
    fn describe(&self) -> String {
        match self {
            FetchError::NotFound => "The backend has no such resource.".to_string(),
            FetchError::Upstream => {
                "The backend could not reach PokeAPI. Try again in a moment.".to_string()
            }
            FetchError::Server(status) => {
                format!("The backend ran into a problem ({status}). Is its database running?")
            }
            FetchError::BadResponse(err) => format!("The backend sent an unexpected response: {err}"),
            FetchError::Unreachable => {
                format!("Could not connect to the backend at {BACKEND_URL}. Is it running?")
            }
        }
    }
}

async fn fetch_json<T: DeserializeOwned>(client: &Client, path: &str) -> Result<T, FetchError> {
    let res = client
        .get(format!("{BACKEND_URL}{path}"))
        .send()
        .await
        .map_err(|_| FetchError::Unreachable)?;
    match res.status() {
        status if status.is_success() => res.json().await.map_err(FetchError::BadResponse),
        StatusCode::NOT_FOUND => Err(FetchError::NotFound),
        StatusCode::BAD_GATEWAY => Err(FetchError::Upstream),
        status => Err(FetchError::Server(status)),
    }
}

/// Fetches a Pokémon, or the message to show in the details pane instead.
async fn fetch_pokemon(client: &Client, id_or_name: &str) -> Result<PokeboxEntry, String> {
    fetch_json(client, &format!("/pokemon/{id_or_name}"))
        .await
        .map_err(|err| match err {
            FetchError::NotFound => format!("The Pokémon \"{id_or_name}\" could not be found."),
            err => format!("Could not load \"{id_or_name}\". {}", err.describe()),
        })
}

#[derive(PartialEq)]
enum AppMode {
    Browsing,
    EnteringId,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // State
    let client = Client::new();
    // Shown in the details pane when a request fails.
    let mut error_message: Option<String> = None;
    let pokedex: Vec<PokedexEntry> = match fetch_json(&client, "/pokedex").await {
        Ok(pokedex) => pokedex,
        Err(err) => {
            error_message = Some(format!("Could not load the Pokédex. {}", err.describe()));
            Vec::new()
        }
    };

    let mut selected = 0usize;
    let mut list_state = ListState::default();
    list_state.select(Some(selected));

    let mut current_pokemon: Option<PokeboxEntry> = None;
    // Which of the current Pokémon's forms is shown; see `forms`.
    let mut form_index = 0usize;
    let mut mode = AppMode::Browsing;
    let mut id_input = String::new();

    loop {
        terminal.draw(|f| {
            let size = f.size();

            // Split screen vertically
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Percentage(90), Constraint::Length(3)])
                .split(size);

            // Split main area horizontally: list on left, details on right
            let main_chunks = Layout::default()
                .direction(Direction::Horizontal)
                .constraints([Constraint::Percentage(30), Constraint::Percentage(70)])
                .split(chunks[0]);

            // Pokémon list with highlight
            let items: Vec<ListItem> = pokedex
                .iter()
                .map(|p| ListItem::new(Line::from(Span::raw(p.name.clone()))))
                .collect();

            let pokedex_list = List::new(items)
                .block(Block::default().title("Pokédex").borders(Borders::ALL))
                .highlight_style(
                    Style::default()
                        .bg(Color::Blue)
                        .fg(Color::Black)
                        .add_modifier(Modifier::BOLD),
                )
                .highlight_symbol("▶ ");

            f.render_stateful_widget(pokedex_list, main_chunks[0], &mut list_state);

            // Right-hand details
            let details = if let Some(message) = &error_message {
                Paragraph::new(message.as_str())
                    .style(Style::default().fg(Color::Red))
                    .block(Block::default().title("Error").borders(Borders::ALL))
            } else if let Some(p) = &current_pokemon {
                Paragraph::new(details_text(p, form_index))
                    .block(Block::default().title("Details").borders(Borders::ALL))
            } else {
                Paragraph::new("Select a Pokémon or press 'i' to enter ID")
                    .block(Block::default().title("Details").borders(Borders::ALL))
            };

            f.render_widget(details, main_chunks[1]);

            // Input box or hint line
            let footer = match mode {
                AppMode::Browsing => {
                    Paragraph::new("↑/↓ navigate  •  Enter view  •  f next form  •  i input ID  •  q quit")
                        .block(Block::default().borders(Borders::ALL))
                }
                AppMode::EnteringId => Paragraph::new(format!("Enter Pokémon ID: {}", id_input))
                    .block(
                        Block::default()
                            .title("Input Mode (Enter = search, Esc = cancel)")
                            .borders(Borders::ALL),
                    ),
            };

            f.render_widget(footer, chunks[1]);
        })?;

        // Handle input
        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                match mode {
                    AppMode::Browsing => match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Down => {
                            if selected + 1 < pokedex.len() {
                                selected += 1;
                                list_state.select(Some(selected));
                            }
                        }
                        KeyCode::Up => {
                            if selected > 0 {
                                selected -= 1;
                                list_state.select(Some(selected));
                            }
                        }
                        KeyCode::Enter => {
                            if let Some(entry) = pokedex.get(selected) {
                                show_pokemon(
                                    fetch_pokemon(&client, &entry.name).await,
                                    &mut current_pokemon,
                                    &mut error_message,
                                );
                                form_index = 0;
                            }
                        }
                        KeyCode::Char('f') => {
                            if let Some(p) = &current_pokemon {
                                form_index = (form_index + 1) % forms(p).len();
                            }
                        }
                        KeyCode::Char('i') => {
                            mode = AppMode::EnteringId;
                            id_input.clear();
                        }
                        _ => {}
                    },
                    AppMode::EnteringId => match key.code {
                        KeyCode::Esc => {
                            id_input.clear();
                            mode = AppMode::Browsing;
                        }
                        KeyCode::Enter => {
                            let id = id_input.trim();
                            if !id.is_empty() {
                                show_pokemon(
                                    fetch_pokemon(&client, id).await,
                                    &mut current_pokemon,
                                    &mut error_message,
                                );
                                form_index = 0;
                            }
                            id_input.clear();
                            mode = AppMode::Browsing;
                        }
                        KeyCode::Backspace => {
                            id_input.pop();
                        }
                        KeyCode::Char(c) if c.is_ascii_alphanumeric() => id_input.push(c),
                        _ => {}
                    },
                }
            }
        }
    }

    // Cleanup
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    Ok(())
}

/// Shows a fetched Pokémon in the details pane, or the reason it couldn't be loaded.
fn show_pokemon(
    result: Result<PokeboxEntry, String>,
    current_pokemon: &mut Option<PokeboxEntry>,
    error_message: &mut Option<String>,
) {
    match result {
        Ok(pokemon) => {
            *current_pokemon = Some(pokemon);
            *error_message = None;
        }
        Err(message) => {
            *current_pokemon = None;
            *error_message = Some(message);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ability(name: &str) -> Ability {
        Ability { name: name.into(), flavour_text: format!("{name} text"), effect: String::new() }
    }

    fn vulpix() -> PokeboxEntry {
        serde_json::from_value(serde_json::json!({
            "id": 37, "name": "vulpix", "form_name": "",
            "species_description": "Fire fox.", "types": ["fire"],
            "abilities": [{"name": "flash-fire", "flavour_text": "Fire.", "effect": ""}],
            "sprites": {"front_default": null},
            "varieties": [{
                "id": 10103, "name": "vulpix-alola", "form_name": "Alolan Form", "is_default": false,
                "species_description": "Ice fox.", "types": ["ice"],
                "abilities": [{"name": "snow-cloak", "flavour_text": "Ice.", "effect": ""}],
                "sprites": {"front_default": null}
            }]
        }))
        .unwrap()
    }

    #[test]
    fn reads_entries_from_servers_without_forms() {
        let old: PokeboxEntry = serde_json::from_value(serde_json::json!({
            "id": 1, "name": "bulbasaur", "species_description": "Seed.", "types": ["grass"],
            "abilities": [], "sprites": {"front_default": null}
        }))
        .unwrap();
        let labels: Vec<_> = forms(&old).into_iter().map(|f| f.label).collect();
        assert_eq!(labels, vec!["Default Form"]);
    }

    #[test]
    fn lists_the_default_form_first() {
        let mut alola = vulpix();
        let default = alola.varieties.remove(0);
        // As the server sends /pokemon/vulpix-alola.
        alola = PokeboxEntry {
            id: default.id,
            name: default.name,
            form_name: default.form_name,
            species_description: default.species_description,
            types: default.types,
            abilities: default.abilities,
            varieties: vec![PokemonVariety {
                id: 37,
                name: "vulpix".into(),
                form_name: String::new(),
                is_default: true,
                species_description: "Fire fox.".into(),
                types: vec!["fire".into()],
                abilities: vec![ability("flash-fire")],
            }],
            ..alola
        };
        let ids: Vec<_> = forms(&alola).into_iter().map(|f| (f.id, f.label)).collect();
        assert_eq!(ids, vec![(37, "Default Form".to_string()), (10103, "Alolan Form".to_string())]);
    }

    #[test]
    fn shows_the_selected_form() {
        let text = details_text(&vulpix(), 1);
        assert!(text.starts_with("#37 vulpix"), "{text}");
        assert!(text.contains("Forms: Default Form  [Alolan Form]"), "{text}");
        assert!(text.contains("Ice fox."), "{text}");
        assert!(text.contains("Types: ice"), "{text}");
        assert!(text.contains("- snow-cloak: Ice."), "{text}");
        assert!(!text.contains("flash-fire"), "{text}");
    }

    #[test]
    fn hides_the_switcher_for_one_form() {
        let mut bulbasaur = vulpix();
        bulbasaur.varieties.clear();
        assert!(!details_text(&bulbasaur, 0).contains("Forms:"));
    }
}
