const readline = require('readline');

function createInterface() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const pending = [];
    let closed = false;
    let waiter = null;

    rl.on('line', (line) => {
        if (waiter) {
            const resolve = waiter;
            waiter = null;
            resolve(line);
            return;
        }
        pending.push(line);
    });

    rl.on('close', () => {
        closed = true;
        if (waiter) {
            const resolve = waiter;
            waiter = null;
            resolve('');
        }
    });

    return {
        ask(message) {
            process.stdout.write(message);
            if (pending.length > 0) return Promise.resolve(pending.shift());
            if (closed) return Promise.resolve('');
            return new Promise((resolve) => {
                waiter = resolve;
            });
        },
        close() {
            rl.close();
        }
    };
}

async function promptConfirm(input, message, defaultValue) {
    const hint = defaultValue ? 'Y/n' : 'y/N';
    const answer = (await input.ask(`${message} (${hint}) `)).trim();
    if (!answer) return Boolean(defaultValue);
    return /^y(es)?$/i.test(answer);
}

async function promptList(input, message, choices, defaultValue) {
    console.log(message);
    choices.forEach((choice, index) => {
        const selected = choice.value === defaultValue ? '*' : ' ';
        console.log(` ${selected} ${index + 1}. ${choice.name}`);
    });

    const fallbackIndex = choices.findIndex((choice) => choice.value === defaultValue);
    const fallback = fallbackIndex >= 0 ? fallbackIndex : 0;
    let selected = null;

    while (selected === null) {
        const answer = (await input.ask(`Select [1-${choices.length}]: `)).trim();
        if (!answer) {
            selected = choices[fallback].value;
        } else {
            const index = Number(answer);
            if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
                selected = choices[index - 1].value;
            } else {
                console.log(`Enter a number from 1 to ${choices.length}.`);
            }
        }
    }

    return selected;
}

async function prompt(questions, session) {
    const ownsInterface = !session;
    const input = session || createInterface();
    const answers = {};

    try {
        for (const question of questions) {
            if (question.type === 'confirm') {
                answers[question.name] = await promptConfirm(input, question.message, question.default);
            } else if (question.type === 'list') {
                answers[question.name] = await promptList(
                    input,
                    question.message,
                    question.choices,
                    question.default
                );
            }
        }
    } finally {
        if (ownsInterface) input.close();
    }

    return answers;
}

module.exports = { prompt, createInterface };
