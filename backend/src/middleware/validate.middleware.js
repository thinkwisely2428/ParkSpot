const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next();
  } catch (err) {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors,
    });
  }
};

module.exports = validate;
