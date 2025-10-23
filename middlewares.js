// yash-pouranik/campusnotes/CampusNotes-00dc19acc7e2ab4dd04f19bd9f985da839b07861/middlewares.js

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(401).json({ error: "You must be logged in." });
    } else {
      req.flash("error", "you must be logged in!");
      return res.redirect("/login-n");
    }
  }
  next();
};

module.exports.notLoggedIn = (req, res, next) => {
  if (req.user) {
    req.flash("error", "You are already logged in!");
    return res.redirect("/");
  }
  next();
};


module.exports.isModerator = (req, res, next) => {
  if(req.user && req.user.roles?.isModerator) {
    console.log("Moderator OK:", req.user.username);
    return next();
  }
  res.status(404).render("errors/404", { 
    title: "Page Not Found | CampusNotes",
  });
};