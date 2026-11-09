import "reflect-metadata";
import type { PokemonSprites } from "pokenode-ts";
import { ObjectId } from "mongodb";
import { Column, Entity, Index, ObjectIdColumn } from "typeorm";
import type { PokemonAbility, PokemonVariety } from "./mapping";

@Entity("pokemon")
export class PokeboxEntry {
  @ObjectIdColumn()
  _id!: ObjectId;

  // Explicitly indexed as documentation of the natural keys looked up by
  // findOneBy in pokebox.ts. Not a performance concern at <=1025 rows on a
  // local instance, but keeps the query surface self-documenting.
  @Index()
  @Column()
  id!: number;

  @Index()
  @Column()
  name!: string;

  /** English form name ("Alolan Form"), or "" when the form has none. */
  @Column()
  form_name!: string;

  @Column()
  species_description!: string;

  @Column()
  types!: string[];

  @Column()
  sprites!: PokemonSprites;

  @Column()
  abilities!: PokemonAbility[];

  /** The species' other forms, never this one. */
  @Column()
  varieties!: PokemonVariety[];
}

export type PokedexEntry = Pick<PokeboxEntry, "id" | "name">;
