// index.js
"use strict";

const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions");
const gqlRequest = require("graphql-request");
const gql = gqlRequest.gql;

// We leave it to the reader to pass these via secret manager
const gqlUrl = "GRAPHQL_URL";
const gqlSecret = "GRAPHQL_SECRET";


const RESULT_SUCCESS = 1000;
const RESULT_UNKNOWN_ERROR = -1;
const RESULT_INVALID_PARAM = -1000;

function getRole(role) {
  switch (role) {
    case 0:
      return "user";
    case 100:
      return "admin";
    default:
      return "user";
  }
}

const getUserRoleGQL = gql`query getRole($uid: String = "") {
  user(where: {id: {_eq: $uid}}) {
    role
  }
}
`;

const createUserGQL = gql`mutation CreateUser($id: String = "", $phone: String = "") {
  insert_user_one(object: {id: $id, phone: $phone}) {
    id
  }
}
`;

exports.onCreateAuthUser = functions.auth.user().onCreate(async (user) => {
  return await createUserClaims(user);
});

exports.refreshUserClaims = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;
  if (uid) {
    return await refreshUserClaims(uid);
  } else {
    return RESULT_INVALID_PARAM;
  }
});

exports.logoutUserClaims = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;
  if (uid) {
    return await logoutUserClaims(uid);
  } else {
    return RESULT_INVALID_PARAM;
  }
});

async function createUserClaims(user) {
  const uid = user.uid;
  const phone = user.phoneNumber;
  const client = new gqlRequest.GraphQLClient(gqlUrl, {
    headers: {
      "x-hasura-admin-secret": gqlSecret,
    },
  });
  const result = await client.request(getUserRoleGQL, {uid: uid});
  if (result.user.length === 0) {
    await client.request(createUserGQL, {
      id: uid,
      phone: phone,
    });
  }
  const customClaims = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user"],
      "x-hasura-user-id": uid,
    },
  };
  return admin.auth().setCustomUserClaims(uid, customClaims)
    .then(() => {
      return RESULT_SUCCESS;
    }).catch(error => {
      console.log(`setCustomUserClaims - error : ${error}`);
      return RESULT_UNKNOWN_ERROR;
    });
}

async function getUserClaims(uid) {
  const client = new gqlRequest.GraphQLClient(gqlUrl, {
    headers: {
      "x-hasura-admin-secret": gqlSecret,
    },
  });
  const result = await client.request(getUserRoleGQL, {uid: uid});
  if (result.user && result.user.length === 1) {
    const role = result.user[0].role;
    const roleStr = getRole(role);
    return {
      "https://hasura.io/jwt/claims": {
        "x-hasura-default-role": roleStr,
        "x-hasura-allowed-roles": [roleStr],
        "x-hasura-user-id": uid,
      },
    };
  }
}

async function refreshUserClaims(uid) {
  const claims = await getUserClaims(uid);
  return await admin.auth().setCustomUserClaims(uid, claims);
}

async function logoutUserClaims(uid) {
  const claims = await getUserClaims(uid);
  await admin.auth().revokeRefreshTokens(uid);
  return await admin.auth().setCustomUserClaims(uid, claims);
}