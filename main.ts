import { Plugin } from "obsidian";

export default class CloseAllPropertiesPlugin extends Plugin {

  async onload() {
    console.log("Close 'All properties' plugin loaded.");

    this.app.workspace.onLayoutReady(() => {
      // Run the auto-close logic once on startup
      this.checkAndCloseAllProperties();
    });
    
  }

  onunload() {
    console.log("Close 'All properties' plugin  unloaded");

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
}