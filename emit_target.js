import fs from "fs"
import path from "path"

// Create .target directory
const targetDir = path.join(process.cwd(), ".target")
const srcDir = path.join(process.cwd(), "src")

/**
 * Creates a directory if it doesn't exist.
 * @param {string} dirPath - The path of the directory to create.
 */
function createDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

/**
 * Removes a directory if it doesn't exist.
 * @param {string} dirPath - The path of the directory to remove.
 */
function removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true })
    }
}

const registry = {
    /** @type {Map<string, string>} */
    schemas: new Map(),
    /** @type {Map<string, string>} */
    examples: new Map(),
    /** @type {Map<string, string>} */
    responses: new Map(),
    /** @type {Map<string, string>} */
    securitySchemes: new Map(),
}

/**
 * Expands colon-refs.
 * 
 * Colon-ref is $ref parameter with custom syntax, for example:
 * ```yaml
 * $ref: ":API:/product/:get"
 * ```
 * First token surrounded with colons is a tag - which corresponds to component type.
 * Last token prepended with colon is a symbol - yaml file.
 * 
 * Inside openapi.yaml, this will be expanded to:
 * ```yaml
 * $ref: "src/API/product/get.yaml"
 * ```
 * however in other files, other tags will be registered and replaced as for example:
 * ```yaml
 * $ref: "#/component/schemas/Product"
 * ```
 * 
 * Later function {@link registerRefs} must be used, to generate `components` tag
 * with registered items.
 * 
 * @param {"API"|"schema"|"example"|"error"|"security"} tag - The custom colon-tag to expand.
 * @param {string} [file] - Optional file path to append.
 * @returns {string} - The expanded absolute path.
 * 
 */
function expandTag(tag, file = "") {
    /** @type {string} */
    let symbol
    if (file) {
        symbol = file.split(":")[ 1 ]
        file = file.split(":").reduce((p, n) => p + n + ".yaml")
    }
    const resolvedPath = path.join(tag, file)
    switch (tag) {
        case "API":
            return resolvedPath
        case "schema":
            registry.schemas.set(symbol, resolvedPath)
            return `#/components/schemas/${symbol}`
        case "example":
            registry.examples.set(symbol, resolvedPath)
            return `#/components/examples/${symbol}`
        case "error":
            registry.responses.set(symbol, resolvedPath)
            return `#/components/responses/${symbol}`
        case "security":
            registry.securitySchemes.set(symbol, resolvedPath)
            return `#/components/securitySchemes/${symbol}`
    }

}

/**
 * Recursively counts the number of files in a directory without reading their contents.
 * @param {string} dir - The directory to count files in.
 * @returns {number} - The total number of files.
 */
function countFiles(dir) {
    let fileCount = 0

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (let entry of entries) {
        const entryPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            fileCount += countFiles(entryPath)
        } else if (entry.isFile()) {
            fileCount++
        }
    }

    return fileCount
}

/**
 * Prints a progress bar in a single line.
 * @param {number} fileIdx - The current file index (1-based).
 * @param {number} fileCnt - The total number of files.
 */
function progressBar(fileIdx, fileCnt) {
    const width = String(fileCnt).length
    const paddedIdx = String(fileIdx).padStart(width, " ")
    const progress = Math.round((fileIdx / fileCnt) * 50)
    const bar = "=".repeat(Math.min(progress, 50)) + " ".repeat(Math.max(50 - progress, 0))
    process.stdout.write(`File ${paddedIdx} of ${fileCnt} [${bar}]\u001b[1G`)
}

const fileCnt = countFiles(srcDir)
let fileRead = 1

/**
 * Recursively copies files from source to destination directory and replaces $ref syntax.
 * @param {string} src - The source directory.
 * @param {string} dest - The destination directory.
 */
function copyAndReplaceRefs(src, dest) {
    if (!fs.existsSync(src)) {
        console.error(`Source directory does not exist: ${src}`)
        return
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
            createDirectory(destPath)
            copyAndReplaceRefs(srcPath, destPath)
        } else if (entry.isFile()) {
            let content = fs.readFileSync(srcPath, "utf-8")
            content = content.replace(/\$ref:\s*":([a-zA-Z_-]+):\/([^"]*)"/g, (_, tag, file) => {
                const expandedPath = expandTag(tag, file)
                return `$ref: "${expandedPath}"`
            })
            fs.writeFileSync(destPath, content, "utf-8")
            progressBar(fileRead++, fileCnt)
        }
    }
}

/**
 * Creates `components` tag inside openapi.yaml and populates with registered tags.
 * 
 * @param {string} dest - The destination directory.
 */
function registerRefs(dest) {

    function append(content = "", indent = 0) {
        fs.appendFileSync(
            path.join(dest, "openapi.yaml"),
            `\n${"    ".repeat(indent)}${content}`,
        )
    }

    /** @param {keyof registry} which */
    function appendComponents(which) {
        if (registry[ which ].size > 0) {
            append(`${which}:`, 1)
            for (const [ symbol, file ] of registry[ which ].entries()) {
                if (/[a-zA-Z]/.test(symbol[ 0 ]))
                    append(`${symbol}:`, 2)
                else
                    append(`"${symbol}":`, 2)
                append(`$ref: "${file}"`, 3)
            }
        }
    }

    append("components:")
    appendComponents("schemas")
    appendComponents("examples")
    appendComponents("responses")
    appendComponents("securitySchemes")
}

removeDirectory(targetDir)
createDirectory(targetDir)

// Copy files from src to .target and replace $ref syntax
copyAndReplaceRefs(srcDir, targetDir)
console.log()
registerRefs(targetDir)

console.log("Precompilation step completed successfully.")
console.log()
