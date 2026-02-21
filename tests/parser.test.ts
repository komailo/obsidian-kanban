import { MarkdownParser } from '../src/parser';
import { KanbanBoard } from '../src/types';

const sampleMarkdown = `
# My Project Board

## Todo
- [ ] Task 1
- [ ] Task 2

## In Progress
- [/] Task 3 (in progress)

## Done
- [x] Task 4
`;

function testParser() {
    console.log("Parsing sample markdown...");
    const board = MarkdownParser.parse(sampleMarkdown);
    console.log("Board title:", board.title);
    console.log("Lanes count:", board.lanes.length);

    board.lanes.forEach(lane => {
        console.log(`Lane: ${lane.title} (${lane.cards.length} cards)`);
        lane.cards.forEach(card => {
            console.log(`  - [${card.completed ? 'x' : ' '}] ${card.content}`);
        });
    });

    console.log("\nStringifying board back to markdown...");
    const outputMarkdown = MarkdownParser.stringify(board);
    console.log(outputMarkdown);

    // Basic validation
    if (board.title !== "My Project Board") throw new Error("Title mismatch");
    if (board.lanes.length !== 3) throw new Error("Lane count mismatch");
    if (board.lanes[0].title !== "Todo") throw new Error("Lane title mismatch");
    if (board.lanes[0].cards.length !== 2) throw new Error("Card count mismatch");
    if (board.lanes[2].cards[0].completed !== true) throw new Error("Completion state mismatch");

    console.log("\nTests passed!");
}

testParser();
