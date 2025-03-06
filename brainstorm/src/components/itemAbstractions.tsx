/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	SchemaFactory,
	Component,
	TreeNode,
	InternalTypes,
	Unhydrated,
	NodeKind,
	TreeNodeSchema,
} from "fluid-framework/alpha";
import type { Session } from "../schema/session_schema.js";
import { JSX } from "react";
import type { Items } from "./items.js";

const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

/**
 * Fields all Items must have.
 */
export const itemFields = {
	/**
	 * Id to make building the React app simpler.
	 */
	id: sf.identifier,
};

export type ItemsSchema = typeof Items;

/**
 * Properties all item types must implement.
 */
export interface ItemExtensions {
	readonly View: (props: {
		clientId: string;
		session: Session;
		fluidMembers: string[];
	}) => JSX.Element;

	/**
	 * When deleting this item, it gets replaced by the returned items.
	 */
	deleted(oldParent: Items, oldIndex: number): void;

	/**
	 * Customizes top level insert.
	 * Allows things like Groups moving selected items into themselves.
	 */
	postInsertNew?(session: Session, clientId: string): void;

	children(): Iterable<Item>;
}

/**
 * An Item node.
 * @remarks
 * Open polymorphic collection which libraries can provide additional implementations of, similar to TypeScript interfaces.
 * Implementations should declare schema who's nodes extends this interface, and have the schema statically implement ItemSchema.
 */
export type Item = TreeNode &
	ItemExtensions &
	InternalTypes.ObjectFromSchemaRecord<typeof itemFields>;

/**
 * Details about the type all item schema must provide.
 * @remarks
 * This pattern can be used for for things like generating insert content menus which can describe and create any of the allowed child types.
 */
export interface ItemStatic {
	readonly description: string;
	default(author: string): Unhydrated<Item>;
	/**
	 * Function to create a button which adds this item type to the target.
	 * @param props - The target to add the item to.
	 *
	 * TODO: currently this is not required, but it could be.
	 */
	AddButton?(props: { target: Items; clientId: string }): JSX.Element;

	readonly icon: JSX.Element;
}

/**
 * A schema for an Item.
 */
export type ItemSchema = TreeNodeSchema<string, NodeKind.Object, Item> & ItemStatic;

/**
 * Subset of `MyAppConfig` which is available while composing components.
 */
export interface MyAppConfigPartial {
	/**
	 * {@link AllowedTypes} containing all ItemSchema contributed by components.
	 */
	readonly allowedItemTypes: Component.LazyArray<ItemSchema>;

	readonly Items: ItemsSchema;
}

/**
 * Example component type for an application.
 *
 * Represents functionality provided by a code library to power a component withing the application.
 *
 * This example uses ComponentSchemaCollection to allow the component to define schema which reference collections of schema from the application configuration.
 * This makes it possible to implement the "open polymorphism" pattern, including handling recursive cases.
 */
export interface MyAppComponent {
	readonly itemTypes: Component.ComponentSchemaCollection<MyAppConfigPartial, ItemSchema>;
}
