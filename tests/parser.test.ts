import { MarkdownParser } from '../src/parser';

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
    console.debug("Parsing sample markdown...");
    const board = MarkdownParser.parse(sampleMarkdown);
    console.debug("Board title:", board.title);
    console.debug("Lanes count:", board.lanes.length);

    board.lanes.forEach(lane => {
        console.debug(`Lane: ${lane.title} (${lane.cards.length} cards)`);
        lane.cards.forEach(card => {
            console.debug(`  - [ ] ${card.content}`);
        });
    });

    console.debug("\nStringifying board back to markdown...");
    const outputMarkdown = MarkdownParser.stringify(board);
    console.debug(outputMarkdown);

    // Basic validation
    if (board.title !== "My Project Board") throw new Error("Title mismatch");
    if (board.lanes.length !== 3) throw new Error("Lane count mismatch");
    if (board.lanes[0]?.title !== "Todo") throw new Error("Lane title mismatch");
    if (board.lanes[0]?.cards.length !== 2) throw new Error("Card count mismatch");
    if (board.lanes[2]?.cards[0]?.content !== "Task 4") throw new Error("Card content mismatch");

    console.debug("\nTests passed!");
}

testParser();
