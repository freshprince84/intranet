"use strict";
/// <reference types="node" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var slugify_1 = __importDefault(require("slugify"));
var prisma = new client_1.PrismaClient();
/**
 * Erstellt oder findet den Markdown-Überordner
 */
function getOrCreateMarkdownFolder(adminUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var existing, slug, newFolder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.cerebroCarticle.findFirst({
                        where: {
                            OR: [
                                { title: 'Intranet - Überblick' },
                                { title: 'Markdown-Dateien' },
                                { slug: 'intranet-ueberblick' },
                                { slug: 'markdown-folder' }
                            ],
                            parentId: null // Muss Root-Artikel sein
                        }
                    })];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        console.log("\u2705 Markdown-Ordner gefunden: \"".concat(existing.title, "\" (ID: ").concat(existing.id, ")"));
                        return [2 /*return*/, existing.id];
                    }
                    return [4 /*yield*/, createUniqueSlug('Intranet - Überblick')];
                case 2:
                    slug = _a.sent();
                    return [4 /*yield*/, prisma.cerebroCarticle.create({
                            data: {
                                title: 'Intranet - Überblick',
                                content: '# Intranet - Überblick\n\nDieser Ordner enthält alle Dokumentationsartikel aus dem Git-Repository.',
                                slug: slug,
                                parentId: null,
                                createdById: adminUserId,
                                isPublished: true,
                                position: 1 // Erste Position für den Überordner
                            }
                        })];
                case 3:
                    newFolder = _a.sent();
                    console.log("\u2705 Markdown-Ordner erstellt: \"".concat(newFolder.title, "\" (ID: ").concat(newFolder.id, ")"));
                    return [2 /*return*/, newFolder.id];
            }
        });
    });
}
/**
 * Erstellt einen eindeutigen Slug
 */
function createUniqueSlug(title) {
    return __awaiter(this, void 0, void 0, function () {
        var baseSlug, slug, counter, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseSlug = (0, slugify_1.default)(title, { lower: true, strict: true });
                    slug = baseSlug;
                    counter = 1;
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.cerebroCarticle.findUnique({
                            where: { slug: slug }
                        })];
                case 2:
                    existing = _a.sent();
                    if (!existing) {
                        return [2 /*return*/, slug];
                    }
                    slug = "".concat(baseSlug, "-").concat(counter);
                    counter++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Korrigiert die Cerebro-Struktur
 */
function fixCerebroStructure() {
    return __awaiter(this, void 0, void 0, function () {
        var adminUser, markdownFolderId_1, allArticles, movedCount, standaloneCount, alreadyCorrectCount, _i, allArticles_1, article, hasGithubPath, isRoot, isInMarkdownFolder, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, 14, 16]);
                    console.log('🔧 Starte Korrektur der Cerebro-Struktur...\n');
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: {
                                OR: [
                                    { id: 1 },
                                    { username: 'admin' }
                                ]
                            }
                        })];
                case 1:
                    adminUser = _a.sent();
                    if (!adminUser) {
                        throw new Error('Kein Admin-User gefunden!');
                    }
                    console.log("\uD83D\uDC64 Verwende Admin-User: ".concat(adminUser.username, " (ID: ").concat(adminUser.id, ")\n"));
                    return [4 /*yield*/, getOrCreateMarkdownFolder(adminUser.id)];
                case 2:
                    markdownFolderId_1 = _a.sent();
                    console.log('');
                    return [4 /*yield*/, prisma.cerebroCarticle.findMany({
                            where: {
                                id: { not: markdownFolderId_1 } // Markdown-Ordner selbst ausschließen
                            }
                        })];
                case 3:
                    allArticles = _a.sent();
                    console.log("\uD83D\uDCCA Gefunden: ".concat(allArticles.length, " Artikel zum Pr\u00FCfen\n"));
                    movedCount = 0;
                    standaloneCount = 0;
                    alreadyCorrectCount = 0;
                    _i = 0, allArticles_1 = allArticles;
                    _a.label = 4;
                case 4:
                    if (!(_i < allArticles_1.length)) return [3 /*break*/, 12];
                    article = allArticles_1[_i];
                    hasGithubPath = article.githubPath !== null && article.githubPath !== '';
                    isRoot = article.parentId === null;
                    isInMarkdownFolder = article.parentId === markdownFolderId_1;
                    if (!hasGithubPath) return [3 /*break*/, 8];
                    if (!!isInMarkdownFolder) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma.cerebroCarticle.update({
                            where: { id: article.id },
                            data: {
                                parentId: markdownFolderId_1,
                                position: null // Position wird automatisch sortiert
                            }
                        })];
                case 5:
                    _a.sent();
                    console.log("\uD83D\uDCC1 Verschoben: \"".concat(article.title, "\" \u2192 Markdown-Ordner"));
                    movedCount++;
                    return [3 /*break*/, 7];
                case 6:
                    console.log("\u2705 Bereits korrekt: \"".concat(article.title, "\" (im Markdown-Ordner)"));
                    alreadyCorrectCount++;
                    _a.label = 7;
                case 7: return [3 /*break*/, 11];
                case 8:
                    if (!!isRoot) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.cerebroCarticle.update({
                            where: { id: article.id },
                            data: {
                                parentId: null,
                                position: null
                            }
                        })];
                case 9:
                    _a.sent();
                    console.log("\uD83D\uDCC4 Verschoben: \"".concat(article.title, "\" \u2192 Root-Level (Standalone)"));
                    movedCount++;
                    return [3 /*break*/, 11];
                case 10:
                    console.log("\u2705 Bereits korrekt: \"".concat(article.title, "\" (Standalone)"));
                    standaloneCount++;
                    _a.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 4];
                case 12:
                    console.log('\n' + '='.repeat(100));
                    console.log('\n📊 ZUSAMMENFASSUNG:\n');
                    console.log("   \u2705 Artikel korrekt verschoben: ".concat(movedCount));
                    console.log("   \u2705 Artikel bereits korrekt: ".concat(alreadyCorrectCount + standaloneCount));
                    console.log("   \uD83D\uDCC1 Artikel im Markdown-Ordner: ".concat(allArticles.filter(function (a) { return a.githubPath && a.parentId === markdownFolderId_1; }).length));
                    console.log("   \uD83D\uDCC4 Standalone-Artikel: ".concat(allArticles.filter(function (a) { return !a.githubPath && a.parentId === null; }).length));
                    console.log('\n' + '='.repeat(100));
                    console.log('\n✅ Struktur-Korrektur abgeschlossen!\n');
                    return [3 /*break*/, 16];
                case 13:
                    error_1 = _a.sent();
                    console.error('❌ Fehler bei der Struktur-Korrektur:', error_1);
                    throw error_1;
                case 14: return [4 /*yield*/, prisma.$disconnect()];
                case 15:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    });
}
// Starte Korrektur
fixCerebroStructure().catch(function (error) {
    console.error('Unbehandelter Fehler:', error);
    process.exit(1);
});
