/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { customizeSchemaTyping, SchemaFactory, Tree } from "fluid-framework/alpha";
import { Session } from "../schema/session_schema.js";
import { Group, GroupView } from "./group.js";
import { AddNoteButton, Note, NoteView, RootNoteWrapper } from "./note.js";
import React, { JSX } from "react";
import { v4 as uuid } from "uuid";
import { Item } from "./itemAbstractions.js";

const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

// Schema for a list of Notes and Groups.
export class Items extends sf.array(
	"Items",
	customizeSchemaTyping([() => Group, () => Note]).simplifiedUnrestricted<Item>(),
) {
	public readonly addNode = (author: string) => {
		const timeStamp = new Date().getTime();

		// Define the note to add to the SharedTree - this must conform to
		// the schema definition of a note
		const newNote = new Note({
			text: "",
			author,
			votes: [],
			created: timeStamp,
			lastChanged: timeStamp,
		});

		// Insert the note into the SharedTree.
		this.insertAtEnd(newNote);
	};

	/**
	 * Add a new group (container for notes) to the SharedTree.
	 */
	public readonly addGroup = (name: string): Group => {
		const group = new Group({
			id: uuid(),
			name,
			items: new Items([]),
		});

		this.insertAtEnd(group);
		return group;
	};
}

export function ItemsView(props: {
	items: Item[];
	parent: Items;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	const isRoot = Tree.parent(props.parent) === undefined;

	const pilesArray: JSX.Element[] = [];
	for (const i of props.items) {
		if (Tree.is(i, Group)) {
			pilesArray.push(
				<GroupView
					key={i.id}
					group={i}
					clientId={props.clientId}
					session={props.session}
					fluidMembers={props.fluidMembers}
				/>,
			);
		} else if (Tree.is(i, Note)) {
			if (isRoot) {
				pilesArray.push(
					<RootNoteWrapper
						key={i.id}
						note={i}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			} else {
				pilesArray.push(
					<NoteView
						key={i.id}
						note={i}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			}
		}
	}

	if (isRoot) {
		return (
			<div className="flex grow-0 flex-row h-full w-full flex-wrap gap-4 p-4 content-start overflow-y-scroll">
				{pilesArray}
				<div className="flex w-full h-24"></div>
			</div>
		);
	} else {
		pilesArray.push(
			<AddNoteButton key="newNote" target={props.parent} clientId={props.clientId} />,
		);
		return <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
	}
}
