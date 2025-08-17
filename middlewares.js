module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "you must be logged in!");
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
  if(req.user && req.user.roles?.isModerator) {
    console.log("Moderator OK:", req.user);
    return next();
  }
  res.status(404).render("errors/404", { 
    title: "Page Not Found | CampusNotes",
  });
};
