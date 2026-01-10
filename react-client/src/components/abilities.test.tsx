import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Abilities } from "./ablities";

const mockAbilities = [
	{
		name: "ability 1",
		effect: "some effect",
		flavour_text: "this ability does things",
	},
	{
		name: "ability 2",
		effect: "some other effect",
		flavour_text: "this ability does other things",
	},
];

describe("abilities", () => {
	test("Happy path render", () => {
		render(<Abilities abilities={[]} />);
		expect(screen.getByText("Abilities")).toBeInTheDocument();
	});

	test("ability names render", () => {
		render(<Abilities abilities={mockAbilities} />);

		expect(screen.getByText("ability 1")).toBeInTheDocument();
		expect(screen.getByText("ability 2")).toBeInTheDocument();
	});

	test("ability effects render", () => {
		render(<Abilities abilities={mockAbilities} />);

		expect(screen.getByText("some effect")).toBeInTheDocument();
		expect(screen.getByText("some other effect")).toBeInTheDocument();
	});

	test("ability flavour texts render", () => {
		render(<Abilities abilities={mockAbilities} />);

		expect(screen.getByText("this ability does things")).toBeInTheDocument();
		expect(
			screen.getByText("this ability does other things"),
		).toBeInTheDocument();
	});
});
