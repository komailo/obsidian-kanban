export interface KanbanCard {
    id: string;
    content: string; // The raw markdown content of the card
    completed: boolean;
    metadata?: Record<string, any>;
}

export interface KanbanLane {
    id: string;
    title: string;
    cards: KanbanCard[];
}

export interface KanbanBoard {
    title: string;
    lanes: KanbanLane[];
    settings?: Record<string, any>;
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
