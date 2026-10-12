function errorHandler(error, _req, res, _next) {
  if (error?.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error?.code === "P2002") {
    return res.status(409).json({ message: "Record already exists" });
  }

  if (error?.name === "MulterError") {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE" ? "One or more files exceed the allowed upload size" : error.message
    });
  }

  const status = error.statusCode || 500;
  return res.status(status).json({
    message: error.message || "Internal server error"
  });
}

module.exports = errorHandler;
