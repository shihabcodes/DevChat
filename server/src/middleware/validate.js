const { z } = require('zod');

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

const registerSchema = z.object({
    email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(40).transform((s) => s.trim()),
});

const loginSchema = z.object({
    email: z.string().email().transform((s) => s.toLowerCase().trim()),
    password: z.string().min(1).max(128),
});

const googleSchema = z.object({
    credential: z.string().min(10).max(8192),
});

const createWorkspaceSchema = z.object({
    name: z.string().min(1).max(60).transform((s) => s.trim()),
});

const joinWorkspaceSchema = z.object({
    inviteCode: z.string().min(4).max(64),
});

const createChannelSchema = z.object({
    workspaceId: objectId,
    name: z.string().min(1).max(40).transform((s) => s.trim()),
    description: z.string().max(200).optional().default(''),
});

const updateChannelSchema = z.object({
    name: z.string().min(1).max(40).transform((s) => s.trim()),
});

const sendMessageSchema = z.object({
    content: z.string().min(1).max(8000),
    type: z.enum(['text', 'code']).optional().default('text'),
    language: z.string().max(40).optional().default(''),
    channelId: objectId,
});

const explainSchema = z.object({
    messageId: objectId.optional(),
    code: z.string().min(1).max(8000),
    language: z.string().max(40).optional().default(''),
});

const aiKeySchema = z.object({
    apiKey: z
        .string()
        .min(20, 'OpenAI API keys start with "sk-" and are at least 20 characters')
        .max(256)
        .refine((s) => s.startsWith('sk-') || s.startsWith('sk-proj-'), {
            message: 'OpenAI keys must start with "sk-"',
        }),
});

function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const flat = result.error.flatten();
            return res.status(400).json({
                error: 'Validation failed',
                details: flat.fieldErrors,
                formErrors: flat.formErrors,
            });
        }
        req.body = result.data;
        next();
    };
}

module.exports = {
    schemas: {
        register: registerSchema,
        login: loginSchema,
        google: googleSchema,
        createWorkspace: createWorkspaceSchema,
        joinWorkspace: joinWorkspaceSchema,
        createChannel: createChannelSchema,
        updateChannel: updateChannelSchema,
        sendMessage: sendMessageSchema,
        explain: explainSchema,
        aiKey: aiKeySchema,
    },
    validate,
    objectId,
};
