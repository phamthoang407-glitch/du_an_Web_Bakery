function notFound(req, res) {
  res.status(404).json({ success: false, message: "Không tìm thấy API." });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Đã xảy ra lỗi máy chủ."
  });
}
module.exports = { notFound, errorHandler };
