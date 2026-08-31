import "reflect-metadata";
import type { PokemonSprites } from "pokenode-ts";
import { ObjectId } from "mongodb";
import { Column, Entity, ObjectIdColumn } from "typeorm";

@Entity("pokemon")
export class PokeboxEntry {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  id!: number;

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
