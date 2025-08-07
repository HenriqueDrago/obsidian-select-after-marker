import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
} from "obsidian";

// Define the interface for our plugin settings
interface SelectAfterMarkerPluginSettings {
	marker: string;
	ignoreWhitespaceAfterMarker: boolean;
}

// Define the default settings
const DEFAULT_SETTINGS: SelectAfterMarkerPluginSettings = {
	marker: "+++", // Default marker
	ignoreWhitespaceAfterMarker: false, // Default to not ignoring whitespace immediately after the marker
};

// Create the settings tab
class SelectAfterMarkerPluginSettingTab extends PluginSettingTab {
	plugin: SelectAfterMarkerPlugin;

	constructor(app: App, plugin: SelectAfterMarkerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty(); // Clear the container

		containerEl.createEl("h2", {
			text: "Select Content Below Marker Settings",
		});

		// Setting for the marker string
		new Setting(containerEl)
			.setName("Marker String")
			.setDesc(
				"Enter the string that marks the beginning of the content to be selected."
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter your marker")
					.setValue(this.plugin.settings.marker)
					.onChange(async (value) => {
						this.plugin.settings.marker = value;
						await this.plugin.saveSettings(); // Save settings when the value changes
					})
			);
		
		// Setting for ignoring whitespace after the marker
		new Setting(containerEl)
			.setName("Ignore Whitespace After Marker")
			.setDesc(
				"Toggle to ignore whitespace (line breaks, tabs, spaces...) immediatelly after the marker."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ignoreWhitespaceAfterMarker)
					.onChange(async (value) => {
						this.plugin.settings.ignoreWhitespaceAfterMarker = value;
						await this.plugin.saveSettings(); // Save settings when the toggle changes
					})
			);
	}
}

export default class SelectAfterMarkerPlugin extends Plugin {
	settings: SelectAfterMarkerPluginSettings;

	async onload() {
		// Load settings when the plugin loads
		await this.loadSettings();

		this.addCommand({
			id: "select-content-below-marker",
			name: "Select text below marker",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const content = editor.getValue();
				const marker = this.settings.marker;
				const markerIndex = content.indexOf(marker);

				// First, check if the marker exists.
				if (markerIndex !== -1) {
					// If it exists, then proceed with the logic.
					let selectionStartIndex = markerIndex + marker.length;

					if (this.settings.ignoreWhitespaceAfterMarker) {
						const contentAfterMarker =
							content.substring(selectionStartIndex);
						const whitespaceMatch =
							contentAfterMarker.match(/^\s+/);
						if (whitespaceMatch) {
							selectionStartIndex += whitespaceMatch[0].length;
						}
					}

					const startPos = editor.offsetToPos(selectionStartIndex);
					const endPos = editor.offsetToPos(content.length);

					editor.setSelection(startPos, endPos);
					new Notice(`Content below "${marker}" selected.`);
				} else {
					// If the marker was never found, just show a notice.
					new Notice(`Marker "${marker}" not found.`);
				}
			},
		});

		// Add the settings tab
		this.addSettingTab(
			new SelectAfterMarkerPluginSettingTab(this.app, this)
		);
	}

	onunload() {
		// Clean up resources if needed
	}

	// Load settings from storage
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	// Save settings to storage
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
