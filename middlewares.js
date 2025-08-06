module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login-n");
  }
  next();
};

module.exports.notLoggedIn = (req, res, next) => {
  if (req.user) {
    req.flash("error", "You are already logged in!");
    return res.redirect("/")
  }
  next();
};


module.exports.isModerator = (req, res, next) => {
  if(req.user && req.user.moderator_YASH_09) {
    return next();
  } 
  req.flash("error", "You are not authorized");
  return res.redirect("/explore");
}