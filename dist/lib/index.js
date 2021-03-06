'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var child_process = require('child_process');
var fetch = _interopDefault(require('node-fetch'));
var ReactDOMServer = _interopDefault(require('react-dom/server'));
var React = _interopDefault(require('react'));
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var iterator = _interopDefault(require('fileable-iterator'));

const identity = (_) => _;
const collapse = contents => Buffer.concat(contents.map(buffer=>Buffer.isBuffer(buffer)? buffer : Buffer.from(String(buffer))));
const ensureName = (name, content, extension = '') => {
    if (!name) {
        content = Buffer.isBuffer(content)
            ? content
            : String(content);
        name = crypto.createHash('sha256').update(content).digest('hex');
    }
    return name + extension;
};

const remoteFileMatch = /^(?:(?:https?)|(?:ftp)):\/\//;

const externalFile = async (uri, {
    context = ''
}) => {
    if (uri.match(remoteFileMatch)) {
        return (await fetch(uri)).buffer();
    } else if (context.match(remoteFileMatch)) {
        return (await fetch(path.join(context, uri).replace(':/', '://'))).buffer();
    } else {
        return fs.readFileSync(path.join(context, uri));
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
        const ps = child_process.spawn(array.shift(), array);
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
        child_process.exec(command, (error, output) => {
            if (error) {
                return reject(error);
            }
            return resolve(output);
        });
    }

});

const SRC_CONTEXT_FOLDER = Symbol('SRC_CONTEXT_FOLDER');
const SRC_CONTEXT_TEMPLATE = Symbol('SRC_CONTEXT_TEMPLATE');

const File = async function* (opts) {
    let {
        end = false,
        name = '',
        folder_context = '',
        template_context = '',
        src_context = SRC_CONTEXT_TEMPLATE,
        children: descendants,
        append = false,
        extension = '',
        mode = 0o666,
        cmd,
        src,
        transform,
        sgmldoctype,
        content: content0,
        raw = false,
        map,
        react_renderer = (component, props) => ReactDOMServer.renderToStaticMarkup(React.createElement(component, props))
    } = opts;

    let children = Array.isArray(descendants)
        ? descendants
        : descendants
            ? [descendants]
            : [];
    const directive = 'FILE';

    const contents = [];
    const postscripts = [];
    let pipecmd;
    if (sgmldoctype) {
        contents.push(`<!doctype ${sgmldoctype}>` + '\n');
    }
    for (const child of children) {

        if (typeof child === 'string' || typeof child === 'number') {
            // Child is string or number
            contents.push(child);
        } else if (child && child.type === File) {
            // Child is File
            const { props } = child;
            for await (const { content, mode} of child.type({
                ...props,
                append: !!props.name,
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
        else if (child && child.type === Symbol.for('react.fragment') || typeof child === 'function') {

            yield* iterator(child, {
                folder_context,
                template_context
            });
        }
        else {

            try {
                const { props } = child;
                contents.push(await react_renderer(child.type, props));
            } catch({message}){
                yield {
                    directive: 'WARNING',
                    messge: `${child} may not be rendered properly: ${message}`
                };
                contents.push(child);
            }
        }
    }
    if (content0) {
        contents.push(content0);
    }
    if (src) {
        const context = src_context === SRC_CONTEXT_FOLDER
            ? folder_context
            : SRC_CONTEXT_TEMPLATE
                ? template_context
                : src_context;

        contents.push(await externalFile(src, {
            context}));
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
    map = map || identity;
    const mappedContent = contents.map(map);
    const content = Buffer.concat(
        [
            raw ? mappedContent : await pipecmd(await transform(collapse(mappedContent)))
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

};
File.SRC_CONTEXT_FOLDER = SRC_CONTEXT_FOLDER;
File.SRC_CONTEXT_TEMPLATE = SRC_CONTEXT_TEMPLATE;
File['FILEABLE COMPONENT'] = true;

module.exports = File;
