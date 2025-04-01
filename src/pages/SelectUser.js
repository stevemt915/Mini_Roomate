import React from 'react';

const SelectUser = () => {
  const users = ['User1', 'User2', 'User3']; // Example user list

  return (
    <div>
      <h1>Select a User</h1>
      <ul>
        {users.map((user, index) => (
          <li key={index}>
            <button onClick={() => alert(`Selected: ${user}`)}>
              {user}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SelectUser;