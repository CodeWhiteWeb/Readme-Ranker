import * as fs from 'fs-extra';

export interface AnalysisReport {
    totalScore: number;
    maxScore: number;
    sections: {
        [section: string]: {
            present: boolean;
            score: number;
            suggestion?: string;
        };
    };
    length: {
        lines: number;
        score: number;
        suggestion?: string;
    };
    formatting: {
        headings: number;
        codeBlocks: number;
        score: number;
        suggestion?: string;
    };
    extras: {
        [extra: string]: {
            present: boolean;
            score: number;
            suggestion?: string;
        };
    };
    suggestions: string[];
}

export class ReadMeAnalyzer {
    private sectionCriteria = [
        {
            name: 'Title',
            regex: /^#\s.+/m,
            score: 10,
            suggestion: 'Add a title at the top using "# Project Name".'
        },
        {
            name: 'Description',
            regex: /##?\s*(Overview|Description)/i,
            score: 10,
            suggestion: 'Add a description section.'
        },
        {
            name: 'Installation',
            regex: /##?\s*Installation/i,
            score: 10,
            suggestion: 'Add an Installation section.'
        },
        {
            name: 'Usage',
            regex: /##?\s*Usage/i,
            score: 10,
            suggestion: 'Add a Usage section.'
        },
        {
            name: 'Example',
            regex: /##?\s*Example/i,
            score: 5,
            suggestion: 'Add an Example section.'
        },
        {
            name: 'Contributing',
            regex: /##?\s*Contributing/i,
            score: 5,
            suggestion: 'Add a Contributing section.'
        },
        {
            name: 'License',
            regex: /##?\s*License/i,
            score: 10,
            suggestion: 'Add a License section.'
        },
        {
            name: 'Badges',
            regex: /!\[.*\]\(.*\)/,
            score: 5,
            suggestion: 'Add badges (e.g., build, coverage, npm version).'
        }
    ];

    private extraCriteria = [
        {
            name: 'Proper Title Format',
            check: (content: string) => /^# [A-Z][\w\s\-]+$/m.test(content),
            score: 3,
            suggestion: 'Use a clear, properly capitalized project title.'
        },
        {
            name: 'Description Length',
            check: (content: string) => {
                const match = content.match(/##?\s*(Overview|Description)[\s\S]*?(?=\n##? |\n# |\n$)/i);
                return !!(match && match[0].split('\n').slice(1).join(' ').trim().length > 50);
            },
            score: 3,
            suggestion: 'Provide a more detailed project description.'
        },
        {
            name: 'Table of Contents',
            check: (content: string) => /##?\s*Table of Contents/i.test(content),
            score: 3,
            suggestion: 'Add a Table of Contents section.'
        },
        {
            name: 'Multiple Badges',
            check: (content: string) => (content.match(/!\[.*\]\(.*\)/g) || []).length > 1,
            score: 2,
            suggestion: 'Add more badges (e.g., build, coverage, npm version).'
        },
        {
            name: 'Images/Screenshots',
            check: (content: string) => /!\[.*(screenshot|image|demo|preview).*?\]\(.*\)/i.test(content),
            score: 3,
            suggestion: 'Add images or screenshots to illustrate your project.'
        },
        {
            name: 'Links',
            check: (content: string) => /\[.*?\]\(https?:\/\/.*?\)/.test(content),
            score: 2,
            suggestion: 'Add relevant links (e.g., documentation, homepage, issues).'
        },
        {
            name: 'Lists',
            check: (content: string) => /^(\s*[-*+]|\d+\.)\s+/m.test(content),
            score: 2,
            suggestion: 'Use lists to organize information.'
        },
        {
            name: 'Tables',
            check: (content: string) => /\|.+\|.+\n\|[-\s|:]+\|/m.test(content),
            score: 2,
            suggestion: 'Add tables for structured data.'
        },
        {
            name: 'Inline Code',
            check: (content: string) => /`[^`]+`/.test(content),
            score: 2,
            suggestion: 'Use inline code for commands or filenames.'
        },
        {
            name: 'Blockquotes',
            check: (content: string) => /^>\s.+/m.test(content),
            score: 1,
            suggestion: 'Use blockquotes for tips or notes.'
        },
        {
            name: 'Consistent Heading Levels',
            check: (content: string) => {
                const headings = (content.match(/^#+\s+/gm) || []).map(h => h.trim().length);
                return headings.length > 1
                    ? headings.every(h => h === headings[0] || h === headings[0] + 1)
                    : true;
            },
            score: 2,
            suggestion: 'Use consistent heading levels for structure.'
        },
        {
            name: 'No Placeholder Text',
            check: (content: string) => !/(TODO|TBD|lorem ipsum|replace this)/i.test(content),
            score: 2,
            suggestion: 'Remove placeholder text like TODO, TBD, or lorem ipsum.'
        },
        {
            name: 'No Broken Markdown',
            check: (content: string) => !/(#+[^ \n])|(\[[^\]]*\]\([^)]+\s*$)/m.test(content),
            score: 2,
            suggestion: 'Fix broken Markdown syntax (headings, links, etc).'
        },
        {
            name: 'Installation Section Has Code',
            check: (content: string) => {
                const match = content.match(/##?\s*Installation([\s\S]*?)(?=\n##? |\n# |\n$)/i);
                return !!(match && /```/.test(match[1]));
            },
            score: 2,
            suggestion: 'Add code blocks to the Installation section.'
        },
        {
            name: 'Usage Section Has Code',
            check: (content: string) => {
                const match = content.match(/##?\s*Usage([\s\S]*?)(?=\n##? |\n# |\n$)/i);
                return !!(match && /```/.test(match[1]));
            },
            score: 2,
            suggestion: 'Add code blocks to the Usage section.'
        },
        {
            name: 'Example Section Has Code',
            check: (content: string) => {
                const match = content.match(/##?\s*Example([\s\S]*?)(?=\n##? |\n# |\n$)/i);
                return !!(match && /```/.test(match[1]));
            },
            score: 1,
            suggestion: 'Add code blocks to the Example section.'
        },
        {
            name: 'Contributing Section Has Guidelines',
            check: (content: string) => {
                const match = content.match(/##?\s*Contributing([\s\S]*?)(?=\n##? |\n# |\n$)/i);
                return !!(match && /(pull request|issue|contribut|guideline|how to)/i.test(match[1]));
            },
            score: 1,
            suggestion: 'Add contribution guidelines to the Contributing section.'
        },
        {
            name: 'License Section Has License Name',
            check: (content: string) => {
                const match = content.match(/##?\s*License([\s\S]*?)(?=\n##? |\n# |\n$)/i);
                return !!(match && /(mit|apache|gpl|bsd|mozilla|unlicense|lgpl|cc)/i.test(match[1]));
            },
            score: 1,
            suggestion: 'Specify the license type in the License section.'
        }
    ];

    async analyze(readmePath: string): Promise<AnalysisReport> {
        const content = await fs.readFile(readmePath, 'utf8');
        const lines = content.split('\n');
        let totalScore = 0;
        let maxScore = 0;
        const sections: AnalysisReport['sections'] = {};
        const extras: AnalysisReport['extras'] = {};
        const suggestions: string[] = [];

        // Section checks
        for (const crit of this.sectionCriteria) {
            const present = crit.regex.test(content);
            sections[crit.name] = {
                present,
                score: present ? crit.score : 0,
                suggestion: present ? undefined : crit.suggestion
            };
            totalScore += present ? crit.score : 0;
            maxScore += crit.score;
            if (!present) suggestions.push(crit.suggestion);
        }

        // Length check
        let lengthScore = 0;
        let lengthSuggestion: string | undefined;
        if (lines.length < 10) {
            lengthSuggestion = 'README is too short. Add more details.';
        } else if (lines.length > 200) {
            lengthSuggestion = 'README is very long. Consider splitting into sections or separate docs.';
            lengthScore = 5;
        } else {
            lengthScore = 10;
        }
        totalScore += lengthScore;
        maxScore += 10;
        if (lengthSuggestion) suggestions.push(lengthSuggestion);

        // Formatting check
        const headingCount = (content.match(/^#+\s+/gm) || []).length;
        const codeBlockCount = (content.match(/```/g) || []).length / 2;
        let formattingScore = 0;
        let formattingSuggestion: string | undefined;
        if (headingCount < 3) {
            formattingSuggestion = 'Add more headings to organize your README.';
        } else if (codeBlockCount < 1) {
            formattingSuggestion = 'Add code blocks for examples or usage instructions.';
        } else {
            formattingScore = 10;
        }
        totalScore += formattingScore;
        maxScore += 10;
        if (formattingSuggestion) suggestions.push(formattingSuggestion);

        // Extra criteria
        for (const crit of this.extraCriteria) {
            let present = false;
            try {
                present = !!crit.check(content); // Ensure boolean
            } catch {
                present = false;
            }
            extras[crit.name] = {
                present,
                score: present ? crit.score : 0,
                suggestion: present ? undefined : crit.suggestion
            };
            totalScore += present ? crit.score : 0;
            maxScore += crit.score;
            if (!present && crit.suggestion) suggestions.push(crit.suggestion);
        }

        return {
            totalScore,
            maxScore,
            sections,
            length: {
                lines: lines.length,
                score: lengthScore,
                suggestion: lengthSuggestion
            },
            formatting: {
                headings: headingCount,
                codeBlocks: codeBlockCount,
                score: formattingScore,
                suggestion: formattingSuggestion
            },
            extras,
            suggestions
        };
    }
}