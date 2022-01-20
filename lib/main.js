"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const signing_1 = require("./signing");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const io = __importStar(require("./io-utils"));

function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (process.env.DEBUG_ACTION === 'true') {
                core.debug("DEBUG FLAG DETECTED, SHORTCUTTING ACTION.");
                return;
            }
            const releaseDir = core.getInput('releaseDirectory');
            const signingKeyBase64 = core.getInput('signingKeyBase64');
            const alias = core.getInput('alias');
            const keyStorePassword = core.getInput('keyStorePassword');
            const keyPassword = core.getInput('keyPassword');
            const keyStoreDirectory = core.getInput('keystoreDirectory');
            console.log(`Preparing to sign key @ ${releaseDir} with signing key`);
            
            console.log(`Test keyStoreDirectory @ ${keyStoreDirectory}`);
            console.log(`Test keyStorePassword ${keyStorePassword}`);
            console.log(`Test keyPassword ${keyPassword}`);
            console.log(`Test siginingKey ${signingKeyBase64}`);
            const aliasDecoded = Buffer.from(alias, 'base64').toString();
            console.log(`Test alias ${aliasDecoded}`);
            const keyStorePasswordDecoded = Buffer.from(keyStorePassword, 'base64').toString();
            console.log(`Test keyStorePassword ${keyStorePasswordDecoded}`);
            const keyPasswordDecoded = Buffer.from(keyPassword, 'base64').toString();
            console.log(`Test keyPassword ${keyPasswordDecoded}`);
            const keystoreDirectoryDecoded = Buffer.from(keyStoreDirectory, 'base64').toString();
            console.log(`Test keyStoreDirectory ${keystoreDirectoryDecoded}`);


            // 1. Find release files
            const releaseFiles = io.findReleaseFiles(releaseDir);
            if (releaseFiles !== undefined) {
                // 3. Now that we have a release files, decode and save the signing key
                const signingKey = path_1.default.join(releaseDir, 'signingKey.jks');
                console.log(`Debug keystore content: ${signingKeyBase64}`);
                var decodedString = Buffer.from(signingKeyBase64, 'base64').toString();
                console.log(`Debug keystore decodedString: ${decodedString}`);
                console.log(`Save in siginingKey.jks...`)
                fs_1.default.writeFileSync(signingKey, decodedString);

                // fs_1.default.writeFileSync(signingKey, signingKeyBase64, 'base64');
                // 4. Now zipalign and sign each one of the the release files
                for (let releaseFile of releaseFiles) {
                    core.debug(`Found release to sign: ${releaseFile.name}`);
                    const releaseFilePath = path_1.default.join(releaseDir, releaseFile.name);
                    let signedReleaseFile = '';
                    if (releaseFile.name.endsWith('.apk')) {
                        if (keyStoreDirectory == '') {
                            signedReleaseFile = yield signing_1.signApkFile(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword);
                        } else {
                            signedReleaseFile = yield signing_1.signApkFile(releaseFilePath, keystoreDirectoryDecoded, aliasDecoded, keyStorePasswordDecoded, keyPasswordDecoded);
                        }
                        
                    }
                    else if (releaseFile.name.endsWith('.aab')) {
                        if (keyStoreDirectory == '') {
                            signedReleaseFile = yield signing_1.signAabFile(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword);
                        } else {
                            signedReleaseFile = yield signing_1.signAabFile(releaseFilePath, keyStoreDirectory, alias, keyStorePassword, keyPassword);
                        }
                    }
                    else {
                        core.error('No valid release file to sign, abort.');
                        core.setFailed('No valid release file to sign.');
                    }
                    core.debug('Release signed! Setting outputs.');
                    core.exportVariable("SIGNED_RELEASE_FILE", signedReleaseFile);
                    core.setOutput('signedReleaseFile', signedReleaseFile);
                }
                console.log('Releases signed!');
            }
            else {
                core.error("No release files (.apk or .aab) could be found. Abort.");
                core.setFailed('No release files (.apk or .aab) could be found.');
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
