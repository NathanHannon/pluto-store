import React, { Component, useState } from "react";
import { Container, Form, FormGroup, Label, Input, Button, Alert, Modal, ModalBody, ModalFooter, ModalHeader} from "reactstrap";
import cookie from 'react-cookies';
import axios from 'axios';

import {toast} from 'react-toastify';
//redux
import {connect} from 'react-redux';
import {deleteAccount,updateAccount,loadUser,getProfile,updateProfile,deleteProfile} from '../Actions/authAction';
//Tab inports
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

var moment = require('moment');

  class Account extends Component{

  constructor(props) {
    super(props);
    this.state = {
      profileid:"",
      email: "",
      password: "",
      userName: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      validate: {
        emailState: ""
      }, 
      errors:{
        email_error:"",
        password_error:"",
        user_name_error:"",
        first_name_error:"",
        last_name_error:"",
        address_error:"",
        phone_number_error:"",
        empty_form:"",
        profile_submission_error:"",
        account_submission_error:"",
      },          
      account:[],
      profile:[] ,
      //payment state
      creditCardNumber: 0,
      creditCardHolderName:"",
      expirationDate : moment().format("YYYY-MM-DD"),
      cvCode : 0,
      //payment errors
      isRegistered: false,
      cardValidation_code: [],
      creditCardNumber_err:"",
      creditCardHolderName_err:"",
      expirationDate_err :"",
      cvCode_err:"",
      addPayment:false,
      addPayment_empty:"",
      //shipping state
      shipping_firstname:"",
      shipping_lastname:"",
      shipping_streetAddress:"",
      shipping_city:"",
      shipping_country:"",
      //shipping errors
      shipping_firstname_err:"",
      shipping_lastname_err:"",
      shipping_streetAddress_err:"",
      shipping_city_err:"",
      shipping_country_err:"",
    };

    this.handleChange = this.handleChange.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    //payment stuff
    this.handlePaymentChange = this.handlePaymentChange.bind(this);
    this.submitPayment = this.submitPayment.bind(this);
    this.toggle = this.toggle.bind(this);
  }

  componentDidMount(){

    var token = cookie.load("token");
    axios.post("http://localhost:5000/checkToken",{
      tokenString:token
    }).then((res) =>{
        this.setState({account:res.data.decoded, email:res.data.decoded.emailaddress, userName:res.data.decoded.username });
    }).then(data =>{
      this.props.getProfile(this.state.account.profileid);
      axios.post('http://localhost:5000/profile/',{
          id:this.state.account.profileid
      })
        .then(res => this.setState({firstName:res.data[0].firstname, lastName:res.data[0].lastname, phoneNumber:res.data[0].phonenumber, profileid:res.data[0].profileid}))
      })
      //payment stuff
      fetch('http://localhost:5000/')
  };

  handleChange = async event => {
    const { target } = event;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const { name } = target;
    await this.setState({
      [name]: value
    });
  };

  handlePaymentChange = async event =>{
      event.preventDefault();
      const { target } = event;
      const value = target.type === "checkbox" ? target.checked : target.value;
      const { name } = target;
      await this.setState({
        [name]: value
      });
  }

//Validations-----------------------------------
  validateEmail = e => {
    const emailRegEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const { validate } = this.state;
    if (emailRegEx.test(e.target.value)) {
      validate.emailState = "has-success";
    } else {
      validate.emailState = "has-danger";
    }
    this.setState({ validate });
  };
//----------------------------------------------
   submitPayment = async event =>{
    event.preventDefault();

    var selectedDate = moment(this.state.expirationDate,"YYYY/MM/DD")
    let now = moment(new Date(),"YYYY/MM/DDD"); //take the current year
    let isValid = true;

    //credit number validation
    if(this.state.creditCardNumber === 0){
        this.setState({creditCardNumber_err:"InValid CreditCard Number"});
    }
    else{
       //this.setState({creditCardNumber_err:""});
       let result = creditCardValidator(this.state.creditCardNumber);
       if(result === true){
         // valid
         this.setState({creditCardNumber_err:""})
       }    
       else{
         this.setState({creditCardNumber_err:"Invalid Credit Card"})
       }    
    }

       await axios.post("http://localhost:5000/payment/validateCreditNumber", {
        creditcardnumber: this.state.creditCardNumber
      })
      .then(res =>{
         this.setState({isRegistered:true, creditCardNumber_err:""})
      })
      .catch(err => {
         this.setState({isRegistered:false, creditCardNumber_err:"Credit Card Number is already Registered"})
      })

    //cardholder validation
    if(this.state.creditCardHolderName.length < 5){
      this.setState({creditCardHolderName_err:"CardholdName must be longer than 5 characters"});
      isValid = false;
    }
    else{
      this.setState({creditCardHolderName_err:""});
    }

    //validation for date
    if (selectedDate.isAfter(now)) {
      this.setState({expirationDate_err:""})
    } else {
      this.setState({expirationDate_err:"The Card is Expired"})
      isValid = false;

    }

    //validate the cvcode
    if(this.state.cvCode.length != 3){
      this.setState({cvCode_err:"CvCode must be 3 numbers in length"})
      isValid = false;
    }
    else{
      this.setState({cvCode_err:""})
    }

    const body ={
      accountid: this.props.auth.user.decoded.accountid,
      creditcardnumber:this.state.creditCardNumber,
      cardholdername: this.state.creditCardHolderName,
      expirationdate: this.state.expirationDate,
      cvcode: this.state.cvCode
    }

    console.log(this.state.isRegistered);


    if(this.state.cvCode_err === "" && 
       this.state.creditCardHolderName_err ==="" 
       && this.state.creditCardNumber_err === "" 
       && this.state.expirationDate_err ===""
       && this.state.isRegistered === true)
        {
                //create the new payment 
         axios.post("http://localhost:5000/payment/add",{
            accountid: this.props.auth.user.decoded.accountid,
            creditcardnumber:this.state.creditCardNumber,
            cardholdername: this.state.creditCardHolderName,
            expirationdate: this.state.expirationDate,
            cvcode: this.state.cvCode
          })
          .then(res =>{
              toast('Successfully added payment option')
          })
          .then(this.toggle)
          .catch(err =>{
              console.log(err);
          })
     }
  }

  onSubmit = event =>{
    event.preventDefault();
    const{errors} = this.state;
    if(this.state.firstName !== "" && this.state.lastname  !== ""  && this.state.phoneNumber  !== "" && 
    this.state.userName !=="" && this.state.lastName !== "" && this.state.password !== "")
    {
      //profile works

      let newProfile_id = this.state.profile.profileid + 1;
      //state variables
      let username = this.state.userName;
      let email = this.state.email;
      let password = this.state.password;
      let isverified = true
      let profileid = newProfile_id
      //regex constants
      const phoneRegex =new RegExp(/\d?(\s?|-?|\+?|\.?)((\(\d{1,4}\))|(\d{1,3})|\s?)(\s?|-?|\.?)((\(\d{1,3}\))|(\d{1,3})|\s?)(\s?|-?|\.?)((\(\d{1,3}\))|(\d{1,3})|\s?)(\s?|-?|\.?)\d{3}(-|\.|\s)\d{4}/);
      const passwordRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})");
      //get the new profile id
    
        //firstname, lastname, and phonenumber -----------------------------------------------------------------
        if(this.state.firstName.length > 50 || this.state.firstName.length < 2){
          this.state.errors.first_name_error = "First name must be between 2 and 50 characters long";
        }
        else{
          this.state.errors.first_name_error = "";
        }
        if(this.state.lastName.length > 50 || this.state.lastName.length < 2){
          this.state.errors.last_name_error = "Last name must be between 2 and 50 characters long";
        }
        else{
          this.state.errors.last_name_error = "";
        }
        if(!phoneRegex.test(this.state.phoneNumber)){
          this.state.errors.phone_number_error = "Invalid Phone number";
        }
        else{
          this.state.errors.phone_number_error = "";
        }
        //Password
        if(!passwordRegex.test(password)){
          this.state.errors.password_error = "Strong password must have a number, a special character, a capital letter, a lowercase letter, and be at least 8 characters in length";
        }
        else{
          this.state.errors.password_error = "";
        }
        //check if the username is already taken
          this.props.uniqueUsernameCheck(this.state.userName);

          if(this.state.isUnique){
            //display an error message
          }
      
          this.setState({errors});
      try{
        this.props.updateProfile(this.state.firstName,this.state.lastName, this.state.phoneNumber, this.state.account.profileid);
        this.props.updateAccount(this.state.userName,this.state.password,this.state.email,true,this.state.account.profileid);
        this.props.history.push('/Home');
      }
      catch(err){
        //display errors
      }
    }
    else{
      this.state.errors.empty_form = "You must filled out the form to update your account";
      this.setState({errors});
    }
  }
  onDelete = event =>{
      //delete account
      event.preventDefault();
      //TODO confirm the choice / cancel
      //Need to delete the profile
      try{
        this.props.deleteAccount(this.state.account.accountid); 
        this.props.deleteProfile(this.state.account.profileid);
      }
      catch(error){
      }
  }

  //payment stuff
   toggle = () => this.setState({addPayment:!this.state.addPayment})


  render() {
        const {
          email,
          password,
          userName,
          firstName,
          lastName,
          phoneNumber,
          //payment
          creditCardNumber,
          creditCardHolderName,
          expirationDate,
          cvCode,
          addPayment,
          //shipping
          shipping_firstname,
          shipping_lastname,
          shipping_streetAddress,
          shipping_city,
          shipping_country,
        } = this.state;

        return (
          <Tabs>
           <TabList>
              <Tab>Account</Tab>
              <Tab>Payment</Tab>
              <Tab>Shipping</Tab>
            </TabList>
           <TabPanel>
              <Container className="register">
                {this.state.errors.empty_form ? <Alert color="danger" >{this.state.errors.empty_form}</Alert> : null}
                <h2>Account Settings</h2>
                <p>* indicates a required field</p>
                <Form onSubmit={this.onSubmit}>
                  <FormGroup>
                    <Label>Email *</Label>
                    <Input
                      disabled
                      type="email"
                      name="email"
                      id="emailInput"
                      value={this.state.email}
                      valid={this.state.validate.emailState === "has-success"}
                      invalid={this.state.validate.emailState === "has-danger"}
                      onChange={e => {
                        this.validateEmail(e);
                        this.handleChange(e);
                      }}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label for="passwordInput">Password *</Label>
                    <Input
                      type="password"
                      name="password"
                      id="passwordInput"
                      value={password}
                      onChange={e => this.handleChange(e)}
                    />
                  {this.state.errors.password_error ? <Alert color="danger" >{this.state.errors.password_error}</Alert> : null}
                  </FormGroup>
                  <FormGroup>
                    <Label>User Name *</Label>
                    <Input
                      type="text"
                      name="userName"
                      id="userNameInput"
                      value={userName}
                      onChange={e => {
                        this.handleChange(e);
                      }}
                    />
                    {this.state.errors.user_name_error ? <Alert color="danger" >{this.state.errors.user_name_error}</Alert> : null}
                  </FormGroup>
                  <FormGroup>
                    <Label>First Name *</Label>
                    <Input
                      type="text"
                      name="firstName"
                      id="firstNameInput"
                      value={firstName}
                      onChange={e => {
                        this.handleChange(e);
                      }}
                    />  
                    {this.state.errors.first_name_error ? <Alert color="danger" >{this.state.errors.first_name_error}</Alert> : null}
                  </FormGroup>
                  <FormGroup>
                    <Label>Last Name *</Label>
                    <Input
                      type="text"
                      name="lastName"
                      id="lastNameInput"
                      value={lastName}
                      onChange={e => {
                        this.handleChange(e);
                      }}
                    />
                    {this.state.errors.last_name_error ? <Alert color="danger" >{this.state.errors.last_name_error}</Alert> : null}
                  </FormGroup>
                  <FormGroup>
                    <Label>Phone Number</Label>
                    <Input
                      type="phone"
                      name="phoneNumber"
                      id="phoneNumberInput"
                      value={phoneNumber}
                      onChange={e => {
                        this.handleChange(e);
                      }}
                    />
                    {this.state.errors.phone_number_error ? <Alert color="danger" >{this.state.errors.phone_number_error}</Alert> : null}
                  </FormGroup>
                  <Button onClick={this.validateForm} type="submit" color='success'>Save</Button>
                  <Button onClick={this.onDelete} type="button" color='danger'>Delete</Button>
                </Form>
              </Container>
            </TabPanel>
           <TabPanel>
              <Button onClick={this.toggle}>Add New Payment Option</Button>
              <Modal isOpen={addPayment} toggle={this.toggle} onSubmit={this.submitPayment} centered={true} style={{'marginleft':'35%'}}>
                    <ModalHeader toggle={this.toggle}>
                    {this.state.addPayment_empty ? <Alert color="danger" >{this.state.addPayment_empty}</Alert> : null}
                      Payment Information
                      <p>* indicates a required field</p>
                    </ModalHeader>
                    <ModalBody>
                        <Container className="Payment">
                        <Form >
                          <FormGroup>
                            <Label>Credit Card Number*</Label>
                            <Input
                              type="number"
                              name="creditCardNumber"
                              id="creditCardNumber"
                              value={creditCardNumber}
                              onChange={e =>{
                                this.handlePaymentChange(e);
                              }}
                            ></Input>
                            {this.state.creditCardNumber_err ? <Alert color="danger" >{this.state.creditCardNumber_err}</Alert> : null}
                          </FormGroup>
                          <FormGroup>
                            <Label>Credit Card Holder Name*</Label>
                            <Input
                              type="text"
                              name="creditCardHolderName"
                              id="creditCardHolderName"
                              value={creditCardHolderName}
                              onChange={e =>{
                                this.handlePaymentChange(e);
                              }}
                              required
                            ></Input>
                         {this.state.creditCardHolderName_err ? <Alert color="danger" >{this.state.creditCardHolderName_err}</Alert> : null}
                          </FormGroup>
                          <FormGroup>
                            <Label>Card Expiration Date*</Label>
                            <Input
                              type="date"
                              name="expirationDate"
                              id="expirationDate"
                              value={expirationDate}
                              onChange={e =>{
                                this.handlePaymentChange(e);
                              }}
                              required
                            ></Input>
                          {this.state.expirationDate_err ? <Alert color="danger" >{this.state.expirationDate_err}</Alert> : null}
                          </FormGroup>
                          <FormGroup>
                            <Label>CVC Code*</Label>
                            <Input
                              type="number"
                              name="cvCode"
                              id="cvCode"
                              min="0"
                              value={cvCode}
                              onChange={e =>{
                                this.handlePaymentChange(e);
                              }}
                            ></Input>
                            {this.state.cvCode_err ? <Alert color="danger" >{this.state.cvCode_err}</Alert> : null}
                          </FormGroup>
                        </Form>
                    </Container>
                      </ModalBody>
                    <ModalFooter>
                      <Button onClick={this.toggle}>Cancel</Button>
                      <Button onClick={this.submitPayment} color='success'>Add</Button>
                    </ModalFooter>
                </Modal>
           </TabPanel>
           <TabPanel>
             <h3>Shipping Information</h3>
           </TabPanel>
          </Tabs>
        );
    }
};


const mapStateToProps = state =>({
  isDeleted: state.auth.isDeleted,
  profileUpdate: state.auth.profileUpdate,
  isUpdate: state.auth.isUpdate,
  auth: state.auth,
  profile:state.auth.profile,
  error:state.error
});

export default connect(mapStateToProps, {deleteAccount,deleteProfile,getProfile,loadUser,updateAccount,updateProfile})(Account);


//using the luhn algorithm to calculate the check digit
function creditCardValidator(cardNumber){
   var length = cardNumber.length;
   var parity = length % 2;
   var sum = 0;
   for(var i =0 ; i < length; i++){
     var d = parseInt(cardNumber.charAt(i))
     if( i % 2 == parity){
       d = d * 2
     }
     if(d > 9){
        d -= 9
     }
     sum += d;
   }
   return (sum % 10) == 0;
}
