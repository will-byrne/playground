// src/main.rs
mod api;
mod types;

use std::io;
use std::time::Duration;

use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph},
    Terminal,
};
use reqwest::Client;
use serde::Deserialize;
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
    species_description: String,
    types: Vec<String>,
    abilities: Vec<Ability>,
    sprites: PokemonSprites,
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
    let pokedex: Vec<PokedexEntry> = client
        .get("http://localhost:3000/pokedex")
        .send()
        .await?
        .json()
        .await?;

    let mut selected = 0usize;
    let mut list_state = ListState::default();
    list_state.select(Some(selected));

    let mut current_pokemon: Option<PokeboxEntry> = None;
    let mut mode = AppMode::Browsing;
    let mut id_input = String::new();

    loop {
        terminal.draw(|f| {
            let size = f.size();

            // Split screen vertically
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Percentage(90),
                    Constraint::Length(3),
                ])
                .split(size);

            // Split main area horizontally: list on left, details on right
            let main_chunks = Layout::default()
                .direction(Direction::Horizontal)
                .constraints([
                    Constraint::Percentage(30),
                    Constraint::Percentage(70),
                ])
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
            let details = if let Some(p) = &current_pokemon {
                Paragraph::new(format!(
                    "#{} {}\n\n{}\n\nTypes: {}\n\nAbilities:\n{}",
                    p.id,
                    p.name,
                    p.species_description,
                    p.types.join(", "),
                    p.abilities
                        .iter()
                        .map(|a| format!("- {}: {}", a.name, a.flavour_text))
                        .collect::<Vec<_>>()
                        .join("\n")
                ))
                .block(Block::default().title("Details").borders(Borders::ALL))
            } else {
                Paragraph::new("Select a Pokémon or press 'i' to enter ID")
                    .block(Block::default().title("Details").borders(Borders::ALL))
            };

            f.render_widget(details, main_chunks[1]);

            // Input box or hint line
            let footer = match mode {
                AppMode::Browsing => Paragraph::new(
                    "↑/↓ navigate  •  Enter view  •  i input ID  •  q quit",
                )
                .block(Block::default().borders(Borders::ALL)),
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
                            let id = pokedex[selected].id;
                            current_pokemon = Some(fetch_pokemon(&client, id).await?);
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
                            if let Ok(id) = id_input.trim().parse::<u32>() {
                                current_pokemon = Some(fetch_pokemon(&client, id).await?);
                            }
                            id_input.clear();
                            mode = AppMode::Browsing;
                        }
                        KeyCode::Backspace => {
                            id_input.pop();
                        }
                        KeyCode::Char(c) if c.is_ascii_digit() => id_input.push(c),
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

async fn fetch_pokemon(client: &Client, id: u32) -> anyhow::Result<PokeboxEntry> {
    let res = client
        .get(&format!("http://localhost:3000/pokemon/{}", id))
        .send()
        .await?
        .json::<PokeboxEntry>()
        .await?;
    Ok(res)
}
