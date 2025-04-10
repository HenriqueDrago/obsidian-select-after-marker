import { Plugin } from "obsidian";

export default class AutoRevealPlugin extends Plugin {
  // What to do when loaded
  async onload() {
    console.log("Auto Reveal plugin loaded");

    // Registers Events
    this.registerEvent(
      // On file open, start async function with the opened file as a parameter
      this.app.workspace.on("file-open", async (file) => {
        // Return if there's no file
        if (!file) return;

        console.log("File opened:", file.path);

        // Checks if there's a file-explorer open
        const explorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];

        // If not, warns and return. Else, continues.
        if (!explorerLeaf) {
          console.warn("File explorer is not open.");
          return;
        }

        // Delay ensures the layout is fully ready
        setTimeout(() => {
          const appAny = this.app as any;
          // Gets the command
          // ?. is a safecheck, if appAny.commands is defined, then try to access .commands["file-explorer:reveal-active-file"]; otherwise return undefined
          const command = appAny.commands?.commands["file-explorer:reveal-active-file"];
          // If command exists, runs it
          if (command) {
            appAny.commands.executeCommandById("file-explorer:reveal-active-file");
            console.log("Executed reveal command");
          } else {
            console.warn("Reveal command not found");
          }
        }, 300);
      })
    );
  }

  onunload() {
    // What to do when unloaded
    console.log("Auto Reveal plugin unloaded");
  }
}
