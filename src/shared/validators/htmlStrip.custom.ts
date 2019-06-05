import * as sanitizeHtml from 'sanitize-html';
import { options } from 'joi';
import * as _ from 'lodash';
// export default (joi ) => {
export function htmlStrip(joi) {
    return {
        name: 'string',
        base: joi.string(),
        language: {
            htmlStrip: 'content invalid',
        },
        rules: [
            {
                name: 'unescape',
                validate(params, value, state, options) {
                    const clean = _.unescape(value);
                    if (clean) {
                        return clean;
                    }

                    return this.createError('string.unescape', { value }, state, options);
                }
            },
            {
                name: 'sanetize',
                validate(params, value, state, options) {
                    const clean = value.replace(/[|&;$%@"<>()+,]/g, "");
                    if (clean) {
                        return clean;
                    }

                    return this.createError('string.sanetize', { value }, state, options);
                }
            },
            {
                name: 'htmlStrip',
                validate(params, value, state, options) {
                    const clean = sanitizeHtml(value, {
                        allowedTags: [],
                        allowedAttributes: {},
                    });

                    if (clean) {
                        return clean;
                    }
                    return this.createError('string.htmlStrip', { value }, state, options);
                },
            }
        ],
    };
}
