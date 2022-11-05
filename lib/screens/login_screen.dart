// login_screen.dart
import "dart:developer";

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _auth = FirebaseAuth.instance;

  String _phoneNumber = '';
  String _smsCode = '';
  bool _codeSent = false;

  void _submitLogin() async {
    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: _phoneNumber,
        verificationCompleted: (PhoneAuthCredential credential) async {
          await _auth.signInWithCredential(credential);
        },
        verificationFailed: (FirebaseAuthException e) {
          if (e.code == 'invalid-phone-number') {
            log('The provided phone number is not valid.');
          }
          if (e.code == "unknown") {
            log('An unknown error occurred.');
          }
        },
        codeSent: (String verificationId, int? resendToken) async {
          log('Code sent to $_phoneNumber');
          while (_codeSent == false) {
            await Future.delayed(const Duration(milliseconds: 200), () {
              //nothing
            });
          }
          PhoneAuthCredential phoneAuthCredential =
          PhoneAuthProvider.credential(verificationId: verificationId, smsCode: _smsCode);
          await _auth.signInWithCredential(phoneAuthCredential);
        },
        codeAutoRetrievalTimeout: (String verificationId) {},
      );
    } catch (e) {
      log('Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.purple,
      body: Center(
        child: Container(
          width: 500,
          height: 600,
          margin: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10.0),
            color: Colors.white,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Padding(
                padding:
                const EdgeInsets.symmetric(vertical: 5, horizontal: 20),
                child: TextField(
                  keyboardType: TextInputType.phone,
                  textAlign: TextAlign.center,
                  onChanged: (value) {
                    _phoneNumber = value;
                  },
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Enter Phone Number',
                  ),
                ),
              ),
              Padding(
                  padding:
                  const EdgeInsets.symmetric(vertical: 5, horizontal: 20),
                  child: TextButton(
                    onPressed: () {
                      _submitLogin();
                    },
                    child: const Text('Login'),
                  )),
              Padding(
                padding:
                const EdgeInsets.symmetric(vertical: 5, horizontal: 20),
                child: TextField(
                  keyboardType: TextInputType.phone,
                  textAlign: TextAlign.center,
                  onChanged: (value) {
                    _smsCode = value;
                  },
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Enter Code',
                  ),
                ),
              ),
              Padding(
                  padding:
                  const EdgeInsets.symmetric(vertical: 5, horizontal: 20),
                  child: TextButton(
                    onPressed: () {
                      _codeSent = true;
                    },
                    child: const Text('Submit Code'),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}