type User = {
  id: string;
  created_at: Date | string;
  deleted_at: Date | string;
  updated_at: Date | string;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  api_token: string;
  metadata: Record<string, unknown>;
};

const myUser = {
  id: "usr_1234252435",
  created_at: "2022-09-30T09:17:20.513Z",
  updated_at: "2022-09-30T09:17:20.513Z",
  deleted_at: null,
  role: "member",
  email: "admin@medusa-test.com",
  password_hash:
    "c2NyeXB0AAEAAAABAAAAAcqgfc/h3py/hj3DlmFdV9IRhrmYk9D4rK4P2+yPXiFU6qazduQ+eDMS3EyKxpT3tPydfGyyGDXEtc5C1kGR8Qk5Ve9Rd5WNLx9uuGxJcdx+",
  first_name: null,
  last_name: null,
  api_token: null,
  metadata: null,
} as unknown as User;

const UserStore: User[] = [myUser];

/**
 * Provides layer to manipulate users.
 * @extends BaseService
 */
export class UserService {
  async list(): Promise<User[]> {
    return UserStore;
  }

  async retrieve(): Promise<User> {
    return myUser;
  }

  async retrieveByApiToken(): Promise<User> {
    return myUser;
  }

  async retrieveByEmail(email: string): Promise<User> {
    if (email === "admin@medusa-test.com") {
      return myUser;
    }

    throw new Error(`User with email: ${email} was not found`);
  }

  async create(user: object): Promise<User> {
    const newUser = {
      id: `usr_${Math.random()}`,
      ...user,
    } as User;

    UserStore.push(newUser);

    return newUser;
  }

  async update(userId: string, update: object): Promise<User> {
    return myUser;
  }

  async delete(userId: string): Promise<void> {
    return Promise.resolve();
  }

  async setPassword_(userId: string, password: string): Promise<User> {
    return myUser;
  }

  async generateResetPasswordToken(userId: string): Promise<string> {
    return "token";
  }
}

export default UserService;
