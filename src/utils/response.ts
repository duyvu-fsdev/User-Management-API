const success = (code: number, message: string, data?: any) => {
  return { code, status: "success", message, data: data || null, errors: null };
};

const error = (
  code: number,
  message: string,
  errorMessages?: string | string[]
) => {
  return {
    code,
    status: "error",
    message,
    data: null,
    errorMessages: errorMessages || "An unexpected error occurred !",
  };
};

export default { success, error };
