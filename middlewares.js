
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
  if(req.user && (req.user.roles?.isModerator || req.user.roles?.isDev)) {
    return next();
  }
  res.status(404).render("errors/404", { 
    title: "Page Not Found | CampusNotes",
  });
};

module.exports.checkAccess = (req, res, next) => {
  if (!req.user) return next();

  if (req.user.isBlocked && req.method !== 'GET') {
    const msg = "This account is blocked. You cannot perform this action.";
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(403).json({ error: msg });
    }
    req.flash("error", msg);
    return res.redirect("back");
  }

  const isVerificationRoute = req.path.startsWith('/verify');
  
  if (!req.user.verification?.verified && req.method === 'POST' && !isVerificationRoute) {
    const msg = 'Verification required to post. Verify <a href="/verify">here</a>';
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(403).json({ error: "Verification required." });
    }
    req.flash("error", msg);
    return res.redirect("/verify");
  }

  next();
};