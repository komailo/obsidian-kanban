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
