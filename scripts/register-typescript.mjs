import { fileURLToPath } from 'node:url'
import { registerHooks } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'

import ts from 'typescript'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      for (const extension of ['.ts', '.tsx']) {
        const candidate = new URL(`${specifier}${extension}`, context.parentURL)
        if (existsSync(candidate)) {
          return { shortCircuit: true, url: candidate.href }
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      const { outputText } = ts.transpileModule(
        readFileSync(new URL(url), 'utf8'),
        {
          fileName: fileURLToPath(url),
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        },
      )
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
