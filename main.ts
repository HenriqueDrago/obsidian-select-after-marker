import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';

// Define the interface for our plugin settings
interface SelectAfterMarkerPluginSettings {
    marker: string;
}

// Define the default settings
const DEFAULT_SETTINGS: SelectAfterMarkerPluginSettings = {
    marker: '+++' // Default marker
}

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

        containerEl.createEl('h2', { text: 'Select Content Below Marker Settings' });

        // Setting for the marker string
        new Setting(containerEl)
            .setName('Marker String')
            .setDesc('Enter the string that marks the beginning of the content to be selected.')
            .addText(text => text
                .setPlaceholder('Enter your marker')
                .setValue(this.plugin.settings.marker)
                .onChange(async (value) => {
                    this.plugin.settings.marker = value;
                    await this.plugin.saveSettings(); // Save settings when the value changes
                }));
    }
}

export default class SelectAfterMarkerPlugin extends Plugin {
    settings: SelectAfterMarkerPluginSettings;

    async onload() {
        // Load settings when the plugin loads
        await this.loadSettings();

        // Add the command
        this.addCommand({
            id: 'select-content-below-marker',
            name: 'Select text below marker or copy selected text',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                const marker = this.settings.marker;
                const markerIndex = content.indexOf(marker);

                if (markerIndex !== -1) {
                    // Calculate the start position right after the marker
                    const startPos = editor.offsetToPos(markerIndex + marker.length);
                    // Get the end position of the document
                    const endPos = editor.offsetToPos(content.length);

                    // Set the selection in the editor
                    editor.setSelection(startPos, endPos);

                    console.log(`Content below marker "${marker}" selected.`);
                    // Show a success notice that the text has been selected
                    new Notice(`Content below "${marker}" selected.`);
                } else {
                    console.log(`Marker "${marker}" not found in the note.`);
                    // Show a notice to the user that the marker was not found
                    new Notice(`Marker "${marker}" not found.`);
                }
            },
        });

        // Add the settings tab
        this.addSettingTab(new SelectAfterMarkerPluginSettingTab(this.app, this));
    }

    onunload() {
        // Clean up resources if needed
    }

    // Load settings from storage
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    // Save settings to storage
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
