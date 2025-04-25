import { Plugin, PluginSettingTab, App, Setting, WorkspaceLeaf, Notice, MarkdownView } from "obsidian";
import { GIT_BACKUP_SYNC_CLOSE_BUTTON_ICON } from './src/constants';

interface HDCustomPluginSettings {

  autoCloseAllProperties: boolean;
  addGitButton: boolean;
}

const DEFAULT_SETTINGS: HDCustomPluginSettings = {
  autoCloseAllProperties: false,
  addGitButton: true,
};

export default class HDCustomPlugin extends Plugin {
  settings: HDCustomPluginSettings;

  async onload() {
    console.log("8D's Custom Plugin loaded");

    await this.loadSettings();

    this.addSettingTab(new HDCustomPluginSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      // Run the auto-close logic once on startup if the setting is enabled
      if (this.settings.autoCloseAllProperties) {
        this.checkAndCloseAllProperties();
      }
    });

    if(this.settings.addGitButton) {
      this.app.workspace.onLayoutReady(() => {
        const gitViews = this.getGitViews();
        gitViews.forEach((exp) => {
          this.addGitButton(exp);
        });
      });
  
      // Git Views that get opened later on
      this.registerEvent(
        this.app.workspace.on('layout-change', () => {
          const gitViews = this.getGitViews();
          gitViews.forEach((exp) => {
            this.addGitButton(exp);
          });
        })
      );
    }
    
  }

  onunload() {
    console.log("8D's Custom Plugin unloaded");
    // Remove all git buttons
    const gitViews = this.getGitViews();
    gitViews.forEach((exp) => {
      this.removeGitButton(exp);
    });

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.settings.autoCloseAllProperties) {
      this.checkAndCloseAllProperties();
    }
  }

  async checkAndCloseAllProperties() {
    // Delay slightly to ensure the layout is fully ready
    setTimeout(() => {
      this.app.workspace.iterateAllLeaves((leaf) => {
        const view = leaf.getViewState();
        if (view.type === "all-properties") {
          leaf.detach();
          console.log("Closed 'All Properties' tab.");
          return true;
        }
      });
    }, 500);
  }

  executeGitCloseCommand = async () => {
    const appAny = this.app as any;
    const commandId = "obsidian-git:backup-and-close";
    try {
      await appAny.commands.executeCommandById(commandId);
      new Notice("Attempting to commit, sync, and close Obsidian.");
    } catch (error) {
      console.error("Error executing Obsidian Git command:", error);
      new Notice("Error executing Git command.");
    }
  };

  private addGitButton(gitView: WorkspaceLeaf): void {
    const container = gitView.view.containerEl as HTMLDivElement;
    const navContainer = container.querySelector(
      'div.nav-buttons-container'
    ) as HTMLDivElement;
    if (!navContainer) {
      return;
    }

    const existingButton = this.getGitButton(gitView);
    if (existingButton) {
      return;
    }

    const newIcon = document.createElement('div');
    this.setButtonProperties(newIcon);
    newIcon.className = 'clickable-icon nav-action-button git-sync-and-close-button';
    this.registerDomEvent(newIcon, 'click', () => {
      this.executeGitCloseCommand();
    });
    navContainer.appendChild(newIcon);
  }

  private removeGitButton(gitView: WorkspaceLeaf): void {
    const button = this.getGitButton(gitView);
    if (button) {
      button.remove();
    }
  }

  private setButtonProperties(
      button: HTMLElement
  ): void {
    button.innerHTML = GIT_BACKUP_SYNC_CLOSE_BUTTON_ICON;
    button.setAttribute(
        'aria-label',
        'Backup, Sync and Close App'
    );
  }

  private getGitViews(): WorkspaceLeaf[] {
    return this.app.workspace.getLeavesOfType('git-view');
  }

  private getGitButton(gitView: WorkspaceLeaf): HTMLDivElement | null {
    return gitView.view.containerEl.querySelector(
      '.git-sync-and-close-button'
    );
  }

}

class HDCustomPluginSettingTab extends PluginSettingTab {
  plugin: HDCustomPlugin;

  constructor(app: App, plugin: HDCustomPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "8D's Custom Plugin Settings" });

    new Setting(containerEl)
      .setName("Auto Close 'All Properties'")
      .setDesc("Automatically close the 'All Properties' tab in the core Properties view on Obsidian startup.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCloseAllProperties)
          .onChange(async (value) => {
            this.plugin.settings.autoCloseAllProperties = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName("Add Git Button")
      .setDesc("Add a button to the 'Git Source Control' that initiates Git Backup&Sync then closes the app.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.addGitButton)
          .onChange(async (value) => {
            this.plugin.settings.addGitButton = value;
            await this.plugin.saveSettings();
          })
      );
  }
}