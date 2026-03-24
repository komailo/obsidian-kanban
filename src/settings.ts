import { App, PluginSettingTab, Setting } from "obsidian";
import KanbanPlugin from "./main";

export interface KanbanSettings {
	defaultLanes: string[];
	newCardInsertionMethod: 'append' | 'prepend';
	newLineTrigger: 'enter' | 'shift-enter';
	hideTagsInTitle: boolean;
	laneWidth: number;
	dateTrigger: string;
	dateFormat: string;
	linkDateToDailyNote: boolean;
	showRelativeDate: boolean;
	newNoteTemplate: string;
	showLinkedPageMetadata: boolean;
	appendArchiveDate: boolean;
	archiveDateFormat: string;
}

export const DEFAULT_SETTINGS: KanbanSettings = {
	defaultLanes: ['Backlog', 'Todo', 'In Progress', 'Done'],
	newCardInsertionMethod: 'append',
	newLineTrigger: 'shift-enter',
	hideTagsInTitle: false,
	laneWidth: 272,
	dateTrigger: '@today',
	dateFormat: 'YYYY-MM-DD',
	linkDateToDailyNote: false,
	showRelativeDate: true,
	newNoteTemplate: '',
	showLinkedPageMetadata: false,
	appendArchiveDate: false,
	archiveDateFormat: 'YYYY-MM-DD',
}

export class KanbanSettingTab extends PluginSettingTab {
	plugin: KanbanPlugin;

	constructor(app: App, plugin: KanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default lanes')
			.setDesc('Default swim lanes for new Kanban boards (one per line)')
			.addTextArea(text => text
				.setPlaceholder('Backlog\nTodo\nIn Progress\nDone')
				.setValue(this.plugin.settings.defaultLanes.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.defaultLanes = value.split('\n').filter(l => l.trim() !== '');
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('New card insertion method')
			.setDesc('Whether new cards are added to the beginning or end of the list')
			.addDropdown(dropdown => dropdown
				.addOption('append', 'Append')
				.addOption('prepend', 'Prepend')
				.setValue(this.plugin.settings.newCardInsertionMethod)
				.onChange(async (value: 'append' | 'prepend') => {
					this.plugin.settings.newCardInsertionMethod = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('New line trigger')
			.setDesc('Whether Enter or Shift+Enter creates a new line in a card')
			.addDropdown(dropdown => dropdown
				.addOption('shift-enter', 'Shift + Enter')
				.addOption('enter', 'Enter')
				.setValue(this.plugin.settings.newLineTrigger)
				.onChange(async (value: 'enter' | 'shift-enter') => {
					this.plugin.settings.newLineTrigger = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Hide tags in card titles')
			.setDesc('When toggled, tags will be hidden from the card display')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideTagsInTitle)
				.onChange(async (value) => {
					this.plugin.settings.hideTagsInTitle = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Lane width')
			.setDesc('Enter a number to set the list width in pixels.')
			.addText(text => {
				text.inputEl.type = 'number';
				text.setValue(this.plugin.settings.laneWidth.toString())
					.onChange(async (value) => {
						const width = parseInt(value, 10);
						if (!isNaN(width)) {
							this.plugin.settings.laneWidth = width;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName('Date trigger')
			.setDesc('When this is typed, it will trigger the date selector (example: @today)')
			.addText(text => text
				.setValue(this.plugin.settings.dateTrigger)
				.onChange(async (value) => {
					this.plugin.settings.dateTrigger = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date format')
			.setDesc('Format used when displaying and storing dates')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Link dates to daily notes')
			.setDesc('When toggled, dates will be rendered as links to daily notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.linkDateToDailyNote)
				.onChange(async (value) => {
					this.plugin.settings.linkDateToDailyNote = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show relative date')
			.setDesc('Display dates as relative to today (e.g. "in 2 days")')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRelativeDate)
				.onChange(async (value) => {
					this.plugin.settings.showRelativeDate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note template')
			.setDesc('This template will be used when creating new notes from Kanban cards (path to file)')
			.addText(text => text
				.setValue(this.plugin.settings.newNoteTemplate)
				.onChange(async (value) => {
					this.plugin.settings.newNoteTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show linked page metadata')
			.setDesc('Display frontmatter metadata from linked pages on the card')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showLinkedPageMetadata)
				.onChange(async (value) => {
					this.plugin.settings.showLinkedPageMetadata = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Append date/time to archived cards')
			.setDesc('When toggled, archiving a card will automatically append the current date/time to the card.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.appendArchiveDate)
				.onChange(async (value) => {
					this.plugin.settings.appendArchiveDate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Archive date format')
			.setDesc('Format used when appending dates to archived cards')
			.addText(text => text
				.setValue(this.plugin.settings.archiveDateFormat)
				.onChange(async (value) => {
					this.plugin.settings.archiveDateFormat = value;
					await this.plugin.saveSettings();
				}));
	}
}
