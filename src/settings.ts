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
	archiveLinkedNotes: boolean;
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
	archiveLinkedNotes: false,
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
			.setName('Board appearance')
			.setHeading();

		new Setting(containerEl)
			.setName('Default lanes')
			.setDesc('Default swim lanes for new kanban boards (one per line)')
			.addTextArea(text => text
				.setPlaceholder('Backlog\ntodo\nin progress\ndone')
				.setValue(this.plugin.settings.defaultLanes.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.defaultLanes = value.split('\n').filter(l => l.trim() !== '');
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Lane width')
			.setDesc('Enter a number to set the list width in pixels')
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
			.setName('Hide tags in card titles')
			.setDesc('Hide tags from the visual card display')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideTagsInTitle)
				.onChange(async (value) => {
					this.plugin.settings.hideTagsInTitle = value;
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
			.setName('Card behavior')
			.setHeading();

		new Setting(containerEl)
			.setName('New card insertion method')
			.setDesc('Whether new cards are added to the beginning or end of the list')
			.addDropdown(dropdown => dropdown
				.addOption('append', 'Append')
				.addOption('prepend', 'Prepend')
				.setValue(this.plugin.settings.newCardInsertionMethod)
				.onChange(async (value) => {
					this.plugin.settings.newCardInsertionMethod = value as 'append' | 'prepend';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('New line trigger')
			.setDesc('Whether Enter or Shift+Enter creates a new line in a card')
			.addDropdown(dropdown => dropdown
				.addOption('shift-enter', 'Shift + Enter')
				.addOption('enter', 'Enter')
				.setValue(this.plugin.settings.newLineTrigger)
				.onChange(async (value) => {
					this.plugin.settings.newLineTrigger = value as 'enter' | 'shift-enter';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date and time')
			.setHeading();

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
			.setDesc('Render dates as links to daily notes')
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
			.setName('Note creation')
			.setHeading();

		new Setting(containerEl)
			.setName('Note template')
			.setDesc('Template for new notes')
			.addText(text => text
				.setValue(this.plugin.settings.newNoteTemplate)
				.onChange(async (value) => {
					this.plugin.settings.newNoteTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Archiving')
			.setHeading();

		new Setting(containerEl)
			.setName('Append date and time to archived cards')
			.setDesc('Automatically append the current date and time when archiving a card')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.appendArchiveDate)
				.onChange(async (value) => {
					this.plugin.settings.appendArchiveDate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Archive linked notes')
			.setDesc('Automatically move linked notes to an archive folder when archiving a card')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.archiveLinkedNotes)
				.onChange(async (value) => {
					this.plugin.settings.archiveLinkedNotes = value;
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
