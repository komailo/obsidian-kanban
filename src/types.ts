export interface KanbanCard {
    id: string;
    content: string; // The raw markdown content of the card
    metadata?: Record<string, unknown>;
    date?: string; // Optional date associated with the card
    priority?: string; // Optional priority name
}

export interface KanbanLane {
    id: string;
    title: string;
    cards: KanbanCard[];
    subLanes?: KanbanLane[];
}

export interface KanbanPriority {
    name: string;
    color: string;
}

export interface KanbanBoardSettings {
    lanes?: string[]; // The defined lane titles for this board, potentially with hierarchy
    dateTrigger?: string;
    dateFormat?: string;
    priorities?: KanbanPriority[];
}

export interface KanbanBoard {
    title: string;
    lanes: KanbanLane[];
    settings?: KanbanBoardSettings;
    description?: string;
}

function findAndRemoveCard(lanes: KanbanLane[], cardId: string): { card: KanbanCard, lane: KanbanLane, index: number } | undefined {
    for (const lane of lanes) {
        const index = lane.cards.findIndex(c => c.id === cardId);
        if (index !== -1) {
            const card = lane.cards.splice(index, 1)[0];
            if (card) return { card, lane, index };
        }
        if (lane.subLanes) {
            const found = findAndRemoveCard(lane.subLanes, cardId);
            if (found) return found;
        }
    }
    return undefined;
}

function findLane(lanes: KanbanLane[], laneId: string): KanbanLane | undefined {
    for (const lane of lanes) {
        if (lane.id === laneId) return lane;
        if (lane.subLanes) {
            const found = findLane(lane.subLanes, laneId);
            if (found) return found;
        }
    }
    return undefined;
}

export function moveCard(board: KanbanBoard, cardId: string, targetLaneId: string, targetIndex: number): KanbanBoard {
    const found = findAndRemoveCard(board.lanes, cardId);
    if (!found) return board;

    const { card, lane: sourceLane, index: cardIndex } = found;

    // Find the target lane and insert the card at the target index
    const targetLane = findLane(board.lanes, targetLaneId);
    if (targetLane) {
        targetLane.cards.splice(targetIndex, 0, card);
    } else {
        // Fallback: put it back where it was
        sourceLane.cards.splice(cardIndex, 0, card);
    }

    return board;
}

export function updateCard(board: KanbanBoard, cardId: string, newContent: string): KanbanBoard {
    const updateInLanes = (lanes: KanbanLane[]): boolean => {
        for (const lane of lanes) {
            const card = lane.cards.find(c => c.id === cardId);
            if (card) {
                card.content = newContent;
                return true;
            }
            if (lane.subLanes && updateInLanes(lane.subLanes)) {
                return true;
            }
        }
        return false;
    };

    updateInLanes(board.lanes);
    return board;
}

export function duplicateCard(board: KanbanBoard, cardId: string): KanbanBoard {
    const duplicateInLanes = (lanes: KanbanLane[]): boolean => {
        for (const lane of lanes) {
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
                return true;
            }
            if (lane.subLanes && duplicateInLanes(lane.subLanes)) {
                return true;
            }
        }
        return false;
    };

    duplicateInLanes(board.lanes);
    return board;
}
