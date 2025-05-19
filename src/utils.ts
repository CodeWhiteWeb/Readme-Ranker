import chalk from 'chalk';

export function readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        fs.readFile(filePath, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}
export function formatReport(report: any): string {
    let output = '';
    output += chalk.bold('Sections:\n');
    for (const [section, info] of Object.entries(report.sections) as [string, any][]) {
        output += `  ${info.present ? chalk.green('[✔]') : chalk.red('[ ]')} ${chalk.cyan(section)}`;
        if (!info.present && info.suggestion) {
            output += chalk.yellow(`  ← ${info.suggestion}`);
        }
        output += '\n';
    }
    output += chalk.bold('\nLength:\n');
    output += `  ${report.length.score === 10 ? chalk.green('[✔]') : chalk.red('[ ]')} ${chalk.yellow(report.length.lines + ' lines')}`;
    if (report.length.suggestion) {
        output += chalk.yellow(`  ← ${report.length.suggestion}`);
    }
    output += '\n';

    output += chalk.bold('\nFormatting:\n');
    output += `  ${report.formatting.score === 10 ? chalk.green('[✔]') : chalk.red('[ ]')} `;
    output += `${chalk.magenta('Headings')}: ${report.formatting.headings}, ${chalk.magenta('Code Blocks')}: ${report.formatting.codeBlocks}`;
    if (report.formatting.suggestion) {
        output += chalk.yellow(`  ← ${report.formatting.suggestion}`);
    }
    output += '\n';

    return output;
}

/**
 * Returns a colored progress bar and percentage string.
 */
export function formatProgressBar(score: number, maxScore: number): string {
    const percent = Math.round((score / maxScore) * 100);
    const barLength = 30;
    const filledLength = Math.round((percent / 100) * barLength);
    const bar = chalk.green('█').repeat(filledLength) + chalk.gray('░').repeat(barLength - filledLength);
    return `${chalk.bold('Score:')} ${chalk.cyan(percent + '%')}  ${bar}`;
}

export function logMessage(message: string): void {
    console.log(message);
}