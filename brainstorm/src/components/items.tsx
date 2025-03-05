/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	SchemaFactory,
	Tree,
	Component,
	TreeNode,
	InternalTypes,
	Unhydrated,
	NodeKind,
	TreeNodeSchema,
	evaluateLazySchema,
	NodeFromSchema,
} from "fluid-framework/alpha";
import { Session } from "../schema/session_schema.js";
import React, { JSX } from "react";

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

export type ItemsSchema = ReturnType<typeof makeItems>;
export type Items = NodeFromSchema<ItemsSchema>;

/**
 * Properties all item types must implement.
 */
export interface ItemExtensions {
	View(props: { clientId: string; session: Session; fluidMembers: string[] }): JSX.Element;

	/**
	 * When deleting this item, it gets replaced by the returned items.
	 */
	deleted(oldParent: Items, oldIndex: number): void;
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
	default(): Unhydrated<Item>;
	AddButton(props: { target: Items; clientId: string }): JSX.Element;
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

	readonly Items: ReturnType<typeof makeItems>;
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

export function makeItems(items: Component.LazyArray<ItemSchema>) {
	// Schema for a list of Notes and Groups.
	return class Items extends sf.array("Items", items) {
		// public readonly addNode = (author: string) => {
		// 	const timeStamp = new Date().getTime();
		// 	// Define the note to add to the SharedTree - this must conform to
		// 	// the schema definition of a note
		// 	const newNote = new Note({
		// 		id: uuid(),
		// 		text: "",
		// 		author,
		// 		votes: [],
		// 		created: timeStamp,
		// 		lastChanged: timeStamp,
		// 	});
		// 	// Insert the note into the SharedTree.
		// 	this.insertAtEnd(newNote);
		// };
		// /**
		//  * Add a new group (container for notes) to the SharedTree.
		//  */
		// public readonly addGroup = (name: string): Group => {
		// 	const group = new Group({
		// 		id: uuid(),
		// 		name,
		// 		items: new Items([]),
		// 	});
		// 	this.insertAtEnd(group);
		// 	return group;
		// };
	};
}

export function ItemsView(props: {
	config: MyAppConfigPartial;
	items: Item[];
	parent: Items;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	const isRoot = Tree.parent(props.parent) === undefined;

	const pilesArray: JSX.Element[] = [];
	for (const i of props.items) {
		pilesArray.push(
			// TODO: RootNoteWrapper
			i.View({
				clientId: props.clientId,
				session: props.session,
				fluidMembers: props.fluidMembers,
			}),
		);
	}

	if (isRoot) {
		return (
			<div className="flex grow-0 flex-row h-full w-full flex-wrap gap-4 p-4 content-start overflow-y-scroll">
				{pilesArray}
				<div className="flex w-full h-24"></div>
			</div>
		);
	} else {
		for (const itemKind of props.config.allowedItemTypes) {
			pilesArray.push(
				evaluateLazySchema(itemKind).AddButton({
					target: props.parent,
					clientId: props.clientId,
				}),
			);
		}

		return <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
	}
}

/**
 * Removes a group from its parent {@link Items}.
 * If the note is not in an {@link Items}, it is left unchanged.
 *
 * Before removing the group, its children are move to the parent.
 */
export function deleteItem(item: Item, config: MyAppConfigPartial): void {
	const parent = Tree.parent(item);
	if (Tree.is(parent, config.Items)) {
		// Run the deletion as a transaction to ensure that the tree is in a consistent state
		Tree.runTransaction(parent, () => {
			// Delete the now empty group
			const i = parent.indexOf(item);
			parent.removeAt(i);
			item.deleted(parent, i);
		});
	}
}
