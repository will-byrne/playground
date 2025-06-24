import { Table, type TableData } from "@mantine/core";
import type { Ability } from "../../App";

export function Abilities({ abilities, pokemonName }: { abilities: Ability[], pokemonName: string}) {
  const abilitiesTableData: TableData = {
      caption: `${pokemonName}'s inherant abilities`,
      head: ['Name', 'Description', 'Effect'],
      body: abilities.map(({name, flavour_text, effect}) => [name, flavour_text, effect]),
    }

    return (
      <Table striped highlightOnHover withColumnBorders data={abilitiesTableData}/>
    );
}