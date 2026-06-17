interface ApiErrorResponse {
    message?: string;
    response?: {
        data?: {
            code?: string;
            msg?: string;
        };
    };
}

// Extracts a human-readable message from an axios error, preferring the
// backend's `msg` field, then its error `code`, then the raw error message.
export const getApiErrorMessage = (err: unknown, fallback: string): string => {
    const error = err as ApiErrorResponse;
    const responseData = error?.response?.data;

    if (responseData?.msg) {
        return responseData.msg;
    }

    if (responseData?.code) {
        return responseData.code;
    }

    if (error?.message) {
        return error.message;
    }

    return fallback;
};
