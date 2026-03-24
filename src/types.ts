export interface KanbanCard {
    id: string;
    content: string; // The raw markdown content of the card
    metadata?: Record<string, any>;
}

export interface KanbanLane {
    id: string;
    title: string;
    cards: KanbanCard[];
}

export interface KanbanBoardSettings {
    lanes?: string[]; // The defined lane titles for this board
}

export interface KanbanBoard {
    title: string;
    lanes: KanbanLane[];
    settings?: KanbanBoardSettings;
    description?: string;
}

export function moveCard(board: KanbanBoard, cardId: string, targetLaneId: string, targetIndex: number): KanbanBoard {
    let sourceLane: KanbanLane | undefined;
    let cardIndex = -1;
    let card: KanbanCard | undefined;

    // Find and remove the card from its source lane
    for (const lane of board.lanes) {
        const index = lane.cards.findIndex(c => c.id === cardId);
        if (index !== -1) {
            sourceLane = lane;
            cardIndex = index;
            card = lane.cards.splice(index, 1)[0];
            break;
        }
    }

    if (!card) return board;

    // Find the target lane and insert the card at the target index
    const targetLane = board.lanes.find(l => l.id === targetLaneId);
    if (targetLane) {
        targetLane.cards.splice(targetIndex, 0, card);
    } else if (sourceLane) {
        // Fallback: put it back where it was if target lane not found
        sourceLane.cards.splice(cardIndex, 0, card);
    }

    return board;
}

export function updateCard(board: KanbanBoard, cardId: string, newContent: string): KanbanBoard {
    for (const lane of board.lanes) {
        const card = lane.cards.find(c => c.id === cardId);
        if (card) {
            card.content = newContent;
            break;
        }
    }
    return board;
}

export function duplicateCard(board: KanbanBoard, cardId: string): KanbanBoard {
    for (const lane of board.lanes) {
        const index = lane.cards.findIndex(c => c.id === cardId);
        if (index !== -1) {
            const card = lane.cards[index];
            if (card) {
                const newCard = {
                    id: Math.random().toString(36).substring(2, 11),
                    content: card.content
                };
                lane.cards.splice(index + 1, 0, newCard);
            }
            break;
        }
    }
    return board;
}
