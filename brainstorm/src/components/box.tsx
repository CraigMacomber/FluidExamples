/* eslint-disable @typescript-eslint/no-unused-vars */
/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX } from "react";
import { dragType } from "../utils/utils.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { SchemaFactory, Tree } from "fluid-framework";
import { Session } from "../schema/session_schema.js";
import { Item, itemFields, ItemSchema, MyAppComponent } from "./itemAbstractions.js";
import { tryAsItemParent, canDropItem as canDropItem } from "./items.js";
import { Component } from "fluid-framework/alpha";
import { RectangleLandscapeFilled } from "@fluentui/react-icons";

const sf = new SchemaFactory("cff5f932-c556-4ea1-bb04-4f20fad2d419");

export class Box extends sf.object("Box", itemFields) implements Item {
	public static readonly description = "Box";
	public static readonly icon = (<RectangleLandscapeFilled />);
	public static default(author: string): Box {
		return new Box({});
	}

	public children(): Iterable<Item> {
		return [];
	}
	public readonly View = (props: {
		clientId: string;
		session: Session;
		fluidMembers: string[];
	}): JSX.Element => {
		return <BoxView box={this} {...props} />;
	};

	public deleted(): void {}
}

export function BoxView(props: {
	box: Box;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	// TODO: most of this is drag and drop logic that could be deduplicated across components

	const [{ isDragging }, drag] = useDrag(() => ({
		type: dragType.ITEM,
		item: props.box,
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	}));

	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.ITEM],
		collect: (monitor) => ({
			isOver: !!monitor.isOver(),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item) => canDropItem(item, Tree.parent(props.box)),
		drop: (item: Item) => {
			tryAsItemParent(Tree.parent(props.box))?.tryStealItem(item, props.box);
		},
	}));

	const attachRef = (el: ConnectableElement) => {
		drag(el);
		drop(el);
	};

	return (
		<div
			className={`transition duration-500${
				status === "exiting" ? " transform ease-out scale-110" : ""
			}`}
		>
			<div
				ref={attachRef}
				className={
					isOver && canDrop
						? "border-l-4 border-dashed border-gray-500"
						: "border-l-4 border-dashed border-transparent"
				}
			>
				<div
					style={{ opacity: isDragging ? 0.5 : 1 }}
					className={
						"relative transition-all flex flex-col bg-black h-24 w-52 shadow-md hover:shadow-lg hover:rotate-0 p-2 " +
						(isOver && canDrop ? "translate-x-3" : "")
					}
					aria-label="Box"
				></div>
			</div>
		</div>
	);
}

export const boxComponent: MyAppComponent = {
	itemTypes(): Component.LazyArray<ItemSchema> {
		return [() => Box];
	},
};
