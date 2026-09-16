import "reflect-metadata";
import type { PokemonSprites } from "pokenode-ts";
import { ObjectId } from "mongodb";
import { Column, Entity, Index, ObjectIdColumn } from "typeorm";

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

  @Column()
  species_description!: string;

  @Column()
  types!: string[];

  @Column()
  sprites!: PokemonSprites;

  @Column()
  abilities!: {
    name: string;
    flavour_text: string;
    effect: string;
  }[];
}

export type PokedexEntry = Pick<PokeboxEntry, "id" | "name">;
