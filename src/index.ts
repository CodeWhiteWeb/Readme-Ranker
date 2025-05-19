import { ReadMeAnalyzer } from './analyzer';
import { formatReport, logMessage, formatProgressBar } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const args = process.argv.slice(2);
const readmePath = args[0];

if (!readmePath) {
    console.error('Please provide the path to the README file.');
    process.exit(1);
}

const absolutePath = path.resolve(readmePath);

if (!fs.existsSync(absolutePath)) {
    console.error('The specified README file does not exist.');
    process.exit(1);
}

async function main() {
    const analyzer = new ReadMeAnalyzer();
    try {
        const report = await analyzer.analyze(absolutePath);
        logMessage(chalk.bold.underline('\nREADME Analysis Report:\n'));
        logMessage(formatReport(report));
        logMessage('\n' + formatProgressBar(report.totalScore, report.maxScore));
        if (report.suggestions.length > 0) {
            logMessage(chalk.bold('\nSuggestions to improve your README:'));
            report.suggestions.forEach(s => logMessage(chalk.yellow('- ' + s)));
        }
    } catch (error) {
        console.error(chalk.red('Error analyzing README:'), error);
        process.exit(1);
    }
}

main();