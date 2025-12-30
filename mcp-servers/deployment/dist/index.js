#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "ssh2";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Server-Konfiguration (kann über Umgebungsvariablen überschrieben werden)
const SERVER_CONFIG = {
    host: process.env.DEPLOY_SERVER_HOST || "65.109.228.106",
    username: process.env.DEPLOY_SERVER_USER || "root",
    privateKeyPath: process.env.DEPLOY_SSH_KEY_PATH || path.join(process.env.HOME || process.env.USERPROFILE || "", ".ssh", "intranet_rsa"),
    passphrase: process.env.DEPLOY_SSH_KEY_PASSPHRASE || undefined,
    serverPath: process.env.DEPLOY_SERVER_PATH || "/var/www/intranet",
    deployScript: process.env.DEPLOY_SCRIPT_PATH || "/var/www/intranet/scripts/utils/deploy_to_server.sh",
};
/**
 * Führt SSH-Befehl auf dem Server aus
 */
async function executeSSHCommand(command, timeout = 300000) {
    return new Promise((resolve) => {
        const conn = new Client();
        let output = "";
        let errorOutput = "";
        // SSH-Key lesen
        let privateKey;
        try {
            privateKey = fs.readFileSync(SERVER_CONFIG.privateKeyPath, "utf8");
        }
        catch (err) {
            resolve({
                success: false,
                output: "",
                error: `SSH-Key nicht gefunden: ${SERVER_CONFIG.privateKeyPath}`,
            });
            return;
        }
        conn
            .on("ready", () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    resolve({
                        success: false,
                        output: "",
                        error: `SSH-Exec-Fehler: ${err.message}`,
                    });
                    return;
                }
                // Timeout setzen
                const timeoutId = setTimeout(() => {
                    stream.destroy();
                    conn.end();
                    resolve({
                        success: false,
                        output: output,
                        error: "Deployment-Timeout (5 Minuten überschritten)",
                    });
                }, timeout);
                stream
                    .on("close", (code, signal) => {
                    clearTimeout(timeoutId);
                    conn.end();
                    resolve({
                        success: code === 0,
                        output: output,
                        error: code !== 0 ? `Exit-Code: ${code}, Signal: ${signal}` : undefined,
                    });
                })
                    .on("data", (data) => {
                    output += data.toString();
                })
                    .stderr.on("data", (data) => {
                    errorOutput += data.toString();
                    output += data.toString(); // Auch stderr in output aufnehmen
                });
            });
        })
            .on("error", (err) => {
            resolve({
                success: false,
                output: "",
                error: `SSH-Verbindungsfehler: ${err.message}`,
            });
        })
            .connect({
            host: SERVER_CONFIG.host,
            username: SERVER_CONFIG.username,
            privateKey: privateKey,
            passphrase: SERVER_CONFIG.passphrase,
            readyTimeout: 20000,
        });
    });
}
/**
 * Bereinigt Build-Ordner und löst Git-Konflikte auf dem Server
 */
async function cleanupBuildFiles() {
    const cleanupCommand = `cd ${SERVER_CONFIG.serverPath} && ` +
        `echo "🔧 Löse Git-Konflikte auf..." && ` +
        `git reset --hard HEAD 2>/dev/null || true && ` +
        `git merge --abort 2>/dev/null || true && ` +
        `echo "🗑️  Lösche Build-Ordner (werden beim Build neu erstellt)..." && ` +
        `rm -rf frontend/build 2>/dev/null || true && ` +
        `rm -rf backend/dist 2>/dev/null || true && ` +
        `git rm -r --cached frontend/build 2>/dev/null || true && ` +
        `git rm -r --cached backend/dist 2>/dev/null || true && ` +
        `echo "✅ Build-Ordner gelöscht und Konflikte aufgelöst"`;
    console.error(`[MCP Deployment] Lösche Build-Ordner und löse Git-Konflikte auf ${SERVER_CONFIG.host}...`);
    return await executeSSHCommand(cleanupCommand, 30000); // 30 Sekunden Timeout
}
/**
 * Führt Deployment auf dem Server aus
 */
async function deployToProduction() {
    console.error(`[MCP Deployment] Starte Deployment auf ${SERVER_CONFIG.host}...`);
    // Schritt 1: Build-Dateien bereinigen
    console.error(`[MCP Deployment] Schritt 1: Bereinige Build-Dateien...`);
    const cleanupResult = await cleanupBuildFiles();
    if (!cleanupResult.success) {
        console.error(`[MCP Deployment] ⚠️ Warnung: Build-Dateien-Bereinigung fehlgeschlagen, fahre trotzdem fort...`);
    }
    else {
        console.error(`[MCP Deployment] ✅ Build-Dateien bereinigt`);
    }
    // Schritt 2: Deployment-Skript ausführen
    console.error(`[MCP Deployment] Schritt 2: Führe Deployment-Skript aus...`);
    console.error(`[MCP Deployment] DEPLOY_SCRIPT_PATH env: ${process.env.DEPLOY_SCRIPT_PATH}`);
    console.error(`[MCP Deployment] SERVER_CONFIG.deployScript: ${SERVER_CONFIG.deployScript}`);
    const command = `cd ${SERVER_CONFIG.serverPath} && bash ${SERVER_CONFIG.deployScript}`;
    console.error(`[MCP Deployment] Befehl: ${command}`);
    const result = await executeSSHCommand(command, 600000); // 10 Minuten Timeout für Deployment
    // Kombiniere Outputs
    const combinedOutput = cleanupResult.output + "\n\n" + result.output;
    const combinedResult = {
        success: result.success,
        output: combinedOutput,
        error: result.error,
    };
    if (result.success) {
        console.error(`[MCP Deployment] ✅ Deployment erfolgreich abgeschlossen`);
    }
    else {
        console.error(`[MCP Deployment] ❌ Deployment fehlgeschlagen: ${result.error}`);
    }
    return combinedResult;
}
/**
 * Prüft Server-Verbindung
 */
async function checkServerConnection() {
    const command = `echo "Server-Verbindung OK" && uname -a`;
    return await executeSSHCommand(command, 10000);
}
// MCP Server erstellen
const server = new Server({
    name: "intranet-deployment",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Tools auflisten
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "deploy_to_production",
                description: "Führt automatisches Deployment auf dem Produktivserver aus. " +
                    "Führt git pull, Migrationen, Builds und alle notwendigen Schritte aus. " +
                    "⚠️ WICHTIG: Server-Neustart muss manuell durchgeführt werden (pm2 restart intranet-backend && sudo systemctl restart nginx)",
                inputSchema: {
                    type: "object",
                    properties: {
                        confirm: {
                            type: "boolean",
                            description: "Bestätigung, dass Deployment gestartet werden soll",
                            default: false,
                        },
                    },
                    required: ["confirm"],
                },
            },
            {
                name: "check_server_connection",
                description: "Prüft die SSH-Verbindung zum Produktivserver. Nützlich zum Testen der Verbindung.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});
// Tool-Aufrufe verarbeiten
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "deploy_to_production") {
            const confirm = args?.confirm;
            if (!confirm) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "❌ Deployment nicht bestätigt. Bitte 'confirm: true' setzen, um Deployment zu starten.",
                        },
                    ],
                    isError: false,
                };
            }
            const result = await deployToProduction();
            if (result.success) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Deployment erfolgreich abgeschlossen!\n\n` +
                                `📋 Deployment-Logs:\n\`\`\`\n${result.output}\n\`\`\`\n\n` +
                                `⚠️ WICHTIG: Server-Neustart erforderlich!\n` +
                                `Führe auf dem Server aus:\n` +
                                `- pm2 restart intranet-backend\n` +
                                `- sudo systemctl restart nginx`,
                        },
                    ],
                    isError: false,
                };
            }
            else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `❌ Deployment fehlgeschlagen!\n\n` +
                                `Fehler: ${result.error || "Unbekannter Fehler"}\n\n` +
                                `📋 Output:\n\`\`\`\n${result.output}\n\`\`\``,
                        },
                    ],
                    isError: true,
                };
            }
        }
        else if (name === "check_server_connection") {
            const result = await checkServerConnection();
            if (result.success) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ Server-Verbindung erfolgreich!\n\n` +
                                `📋 Server-Info:\n\`\`\`\n${result.output}\n\`\`\``,
                        },
                    ],
                    isError: false,
                };
            }
            else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `❌ Server-Verbindung fehlgeschlagen!\n\n` +
                                `Fehler: ${result.error || "Unbekannter Fehler"}\n\n` +
                                `📋 Output:\n\`\`\`\n${result.output}\n\`\`\``,
                        },
                    ],
                    isError: true,
                };
            }
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Unbekanntes Tool: ${name}`,
                    },
                ],
                isError: true,
            };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Fehler beim Ausführen von ${name}: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
// Server starten
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Deployment Server gestartet");
}
main().catch((error) => {
    console.error("Fehler beim Starten des MCP Servers:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map