// NOTE: We can't yet use import with assert type json with ESLint.
import { readFileSync } from 'fs'

export const Package = JSON.parse(readFileSync('package.json'))

export default Package
