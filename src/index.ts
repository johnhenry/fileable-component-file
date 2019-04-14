import { createComponent } from 'fileable-components';
import {exec, spawn} from 'child_process';
import fetch from 'node-fetch';

import ReactDOMServer from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
const identity = (_) => _;
const collapse = contents => Buffer.concat(contents.map(Buffer.from));
const ensureName = (name, content, extension = '') => {
    if (!name) {
        name = createHash('sha256').update(content).digest('hex');
    }
    return name + extension;
};

const remoteFileMatch = /^(?:(?:https?)|(?:ftp)):\/\//;

const externalFile = async (uri, {
    template_context = ''
}) => {
    if (uri.match(remoteFileMatch)) {
        return (await fetch(uri)).buffer();
    } else {
        return readFileSync(join(template_context, uri));
    }
};

const transformFormatJSON = (buff) => JSON.stringify(JSON.parse(buff.toString().trim()), undefined, ' ');
const transformBase64 = (buff) => new Buffer(buff.toString().trim(), 'base64');
const runcmd = async (command, pipedContent=undefined) => new Promise((resolve, reject) => {
    if (pipedContent) {
        const regexp = /[^\s"]+|"([^"]*)"/gi;
        const array = [];
        const cache = [];
        let match;
        //https://stackoverflow.com/questions/2817646/javascript-split-string-on-space-or-on-quotes-to-array
        do {
            match = regexp.exec(command);
            if (match !== null) {
                array.push(match[1] ? match[1] : match[0]);
            }
        } while (match !== null);
        const ps = spawn(array.shift(), array);
        ps.stdin.write(pipedContent);
        ps.stdout.on('data', (data) => cache.push(data));
        ps.stderr.on('data', (error) => reject(error));
        ps.on('close', (code) => {
            if (code === 0) {
                return resolve(collapse(cache));
            }
            reject(code);
        });
        ps.stdin.end();
    } else {
        exec(command, (error, output) => {
            if (error) {
                return reject(error);
            }
            return resolve(output);
        });
    }

});
const File = async function* ({
    end = false,
    name='',
    folder_context = '',
    template_context = '',
    children: descendants,
    append = false,
    extension = '',
    mode = 0o666,
    cmd,
    src,
    incremental = false,
    transform,
    doctype,
    content: content0,
    react_renderer = ReactDOMServer.renderToStaticMarkup
}) {
    const children = Array.isArray(descendants)
        ? descendants
        : descendants
            ? [descendants]
            : [];
    const directive = 'FILE';
    if (incremental && !name || extension || transform || cmd) {
        incremental = false;
    }
    if (incremental) {
        if (doctype) {
            const content = `<!doctype ${doctype}>`+'\n';
            yield {
                directive,
                append,
                content,
                mode,
                name,
                folder_context
            };
            append = true;
        }
        for (const child of children) {
            if (typeof child === 'string') {
                const content = child;
                yield {
                    directive,
                    append,
                    content,
                    mode,
                    name,
                    folder_context
                };
                append = true;
            } else if (child.type === File) {
                const { props } = child;
                for await (const { content } of child.type({
                    ...props,
                    folder_context,
                    template_context
                })) {
                    yield {
                        directive,
                        append,
                        content,
                        mode,
                        name,
                        folder_context
                    };
                    append = true;
                }
            } else {
                const content = react_renderer(child);
                yield {
                    directive,
                    append,
                    content,
                    mode,
                    name,
                    folder_context
                };
                append = true;
            }
        }
        if (content0) {
            const content = content0;
            yield {
                directive,
                append,
                content,
                mode,
                name,
                folder_context
            };
            append = true;
        }
        if (src) {
            const content = await externalFile(src, { template_context });
            yield {
                directive,
                append,
                content,
                mode,
                name,
                folder_context
            };
            append = true;
        }
        if (cmd) {
            const content = await runcmd(cmd);
            yield {
                directive,
                append,
                content,
                mode,
                name,
                folder_context
            };
            append = true;
        }
        if (end) {
            const content = end === true ? '\n' : end;
            yield {
                directive,
                append,
                content,
                mode,
                name,
                folder_context
            };
            append = true;
        }
    } else {
        const contents = [];
        const postscripts = [];
        let pipecmd;
        if (doctype) {
            contents.push(`<!doctype ${doctype}>` + '\n');
        }
        for (const child of children) {
            if (typeof child === 'string') {
                contents.push(child);
            } else if (child.type === File) {
                const { props } = child;
                for await (const { content, mode} of child.type({
                    ...props,
                    append: !!props.name,
                    incremental: false,
                    folder_context,
                    content: props.clone ? collapse(contents) : props.content,
                    template_context,
                })) {
                    if (props.ps) {
                        if (typeof props.ps === 'string') {
                            if (props.name) {
                                yield {
                                    directive,
                                    append:false,
                                    content,
                                    mode,
                                    name: props.name,
                                    folder_context
                                };
                            }
                            postscripts.push(props.ps);
                        } else {
                            postscripts.push(content);
                        }
                    } else {
                        contents.push(content);
                    }
                }
            }
            else {
                contents.push(react_renderer(child));
            }
        }
        if (content0) {
            contents.push(content0);
        }
        if (src) {
            contents.push(await externalFile(src, { template_context }));
        }
        if (cmd && (cmd = cmd.trim())) {
            if (cmd[0] === '|') {
                pipecmd = async (content) => await runcmd(cmd, content);
                cmd = cmd.substring(1);
            } else {
                contents.push(await runcmd(cmd));
            }
        }
        if (typeof transform === 'string') {
            switch (transform) {
                case 'JSON': {
                    transform = transformFormatJSON;
                } break;
                case 'base64': {
                    transform = transformBase64;
                } break;
                default : {
                    transform = undefined;
                } break;
            }
        }
        transform = transform || identity;
        pipecmd = pipecmd || identity;
        if (end) {
            const content = end === true ? '\n' : end;
            postscripts.push(content);
        }
        const content = Buffer.concat(
            [
                await pipecmd(await transform(collapse(contents)))
                , collapse(postscripts)
            ]);

        name = ensureName(name, content, extension);
        yield {
            directive,
            append,
            content,
            mode,
            name,
            folder_context
        };
    }
};
export default createComponent(File);
