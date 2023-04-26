
class User {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.image = "";
    this.age = "";
    this.city = "";
    this.gender = "";
    this.activities = [];
  }

  hasActivity(activity) {
    return this.activities.some(a => a.name === activity.name);
  }
  getImage() {
    return this.image;
  }
}

class UserManager {
  constructor() {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    this.users = users.map((user) => {
      const newUser = new User(user.username, user.password);
      newUser.image = user.image || "";
      newUser.age = user.age || "";
      newUser.city = user.city || "";
      newUser.gender = user.gender || "";
      newUser.activities = user.activities || [];
      return newUser;
    });
  }

  fetchAllUsers() {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    return users.map((user) => {
      const newUser = new User(user.username, user.password);
      newUser.image = user.image || "";
      newUser.age = user.age || "";
      newUser.city = user.city || "";
      newUser.gender = user.gender || "";
      newUser.activities = user.activities || [];
      return newUser;
    });
  }

  registerUser = (username, password) => {
    const userExists = this.users.some((user) => user.username === username);

    if (userExists) {
      return Promise.reject(new Error("Username already exists"));
    }

    const user = new User(username, password,);
    this.users.push(user);
    localStorage.setItem("users", JSON.stringify(this.users));
    this.saveUserData();
    return Promise.resolve();
  };

  loginUser = (username, password) => {
    const user = this.users.find((user) => user.username === username && user.password === password);

    if (!user) {
      return Promise.reject(new Error("Invalid username or password"));
    }

    sessionStorage.setItem("loggedInUser", JSON.stringify({
      username: user.username,
    }));
    return Promise.resolve();
  };

  logoutUser = () => {
    sessionStorage.removeItem("loggedInUser");
    return Promise.resolve();
  };

  getLoggedInUser() {
    const userJson = sessionStorage.getItem("loggedInUser");
    if (!userJson) {
      return null;
    }
    const userObj = JSON.parse(userJson);
    const user = this.users.find((u) => u.username === userObj.username);
    if (!user) {
      return null;
    }
    return user;
  }

  setLoggedInUser = (user) => {
    const loggedInUser = this.getLoggedInUser();

    if (loggedInUser) {
      loggedInUser.username = user.username;
      loggedInUser.age = user.age;
      loggedInUser.city = user.city;
      loggedInUser.gender = user.gender;
      loggedInUser.image = user.image;
      loggedInUser.activities = user.activities;
      this.saveUserData();
    }
  }

  saveUserData() {
    const loggedInUser = this.getLoggedInUser();
    if (loggedInUser) {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const updatedUsers = users.map((user) => {
        if (user.username === loggedInUser.username) {
          user.image = loggedInUser.image || user.image;
          user.age = loggedInUser.age || user.age;
          user.city = loggedInUser.city || user.city;
          user.gender = loggedInUser.gender || user.gender;
          user.activities = loggedInUser.activities || user.activities;
        }
        return user;
      });
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
  }

  addActivity(activity) {
    const user = this.getLoggedInUser();
    if (user && !user.hasActivity(activity)) {
      user.activities.push(activity);
      this.saveUserData();
    }
  }

  removeActivity(activity) {
    const user = this.getLoggedInUser();
    if (user && user.hasActivity(activity)) {
      user.activities = user.activities.filter(a => a.name !== activity.name);
      this.saveUserData();
    }
  }
}
const userManager = new UserManager();

export default userManager;
