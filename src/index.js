import React from 'react';

import {
    View,
    Text,
    TextInput,
    Image,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import memoize from 'lodash.memoize';
import reduce from 'lodash.reduce';
import startsWith from 'lodash.startswith';
// import classNames from 'classnames';
import './utils/prototypes'

import CountryData from './CountryData.js';

import FLAG_IMAGE_POSITION from './flag-image-position';

class PhoneInput extends React.Component {
    static propTypes = {
        country: PropTypes.string,
        value: PropTypes.string,

        onlyCountries: PropTypes.arrayOf(PropTypes.string),
        preferredCountries: PropTypes.arrayOf(PropTypes.string),
        excludeCountries: PropTypes.arrayOf(PropTypes.string),

        placeholder: PropTypes.string,
        searchPlaceholder: PropTypes.string,
        searchNotFound: PropTypes.string,
        disabled: PropTypes.bool,
        cancelButtonText: PropTypes.string,

        containerStyle: PropTypes.object,
        inputStyle: PropTypes.object,
        buttonStyle: PropTypes.object,
        dropdownStyle: PropTypes.object,
        searchStyle: PropTypes.object,
        arrowColor: PropTypes.string,
        cancelButtonStyle: PropTypes.object,
        countryNameStyle: PropTypes.object,
        countryDialCodeStyle: PropTypes.object,
        modalRootStyle: PropTypes.object,

        containerClass: PropTypes.string,
        inputClass: PropTypes.string,
        buttonClass: PropTypes.string,
        dropdownClass: PropTypes.string,
        searchClass: PropTypes.string,

        autoFormat: PropTypes.bool,

        enableAreaCodes: PropTypes.oneOfType([
            PropTypes.bool, PropTypes.arrayOf(PropTypes.string)
        ]),
        enableTerritories: PropTypes.oneOfType([
            PropTypes.bool, PropTypes.arrayOf(PropTypes.string)
        ]),

        disableCountryCode: PropTypes.bool,
        disableDropdown: PropTypes.bool,
        enableLongNumbers: PropTypes.bool,
        countryCodeEditable: PropTypes.bool,
        enableSearch: PropTypes.bool,
        disableSearchIcon: PropTypes.bool,
        showSearchInput: PropTypes.bool,

        regions: PropTypes.oneOfType([
            PropTypes.string, PropTypes.arrayOf(PropTypes.string)
        ]),

        inputProps: PropTypes.object,
        localization: PropTypes.object,
        masks: PropTypes.object,
        areaCodes: PropTypes.object,

        preserveOrder: PropTypes.arrayOf(PropTypes.string),

        defaultMask: PropTypes.string,
        alwaysDefaultMask: PropTypes.bool,
        prefix: PropTypes.string,
        copyNumbersOnly: PropTypes.bool,
        renderStringAsFlag: PropTypes.string,
        autocompleteSearch: PropTypes.bool,
        jumpCursorToEnd: PropTypes.bool,
        priority: PropTypes.object,
        enableAreaCodeStretch: PropTypes.bool,
        enableClickOutside: PropTypes.bool,
        showDropdown: PropTypes.bool,

        onChange: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onEndEditing: PropTypes.func,
        isValid: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
        defaultErrorMessage: PropTypes.string
    }

    static defaultProps = {
        country: '',
        value: '',

        onlyCountries: [],
        preferredCountries: [],
        excludeCountries: [],

        placeholder: '1 (702) 123-4567',
        searchPlaceholder: 'search',
        searchNotFound: 'No entries to show',
        flagsImagePath: './flags.png',
        disabled: false,
        cancelButtonText: 'Cancel',

        containerStyle: {},
        inputStyle: {},
        buttonStyle: {},
        dropdownStyle: {},
        searchStyle: {},
        arrowColor: '#70544F',
        cancelButtonStyle: {},
        countryNameStyle: {},
        countryDialCodeStyle: {},

        containerClass: '',
        inputClass: '',
        buttonClass: '',
        dropdownClass: '',
        searchClass: '',

        autoFormat: true,
        enableAreaCodes: false,
        enableTerritories: false,
        disableCountryCode: false,
        disableDropdown: false,
        enableLongNumbers: false,
        countryCodeEditable: true,
        enableSearch: false,
        disableSearchIcon: false,
        showSearchInput: false,

        regions: '',

        inputProps: {},
        localization: {},

        masks: null,
        priority: null,
        areaCodes: null,

        preserveOrder: [],

        defaultMask: '... ... ... ... ..', // prefix+dialCode+' '+defaultMask
        alwaysDefaultMask: false,
        prefix: '+',
        copyNumbersOnly: true,
        renderStringAsFlag: '',
        autocompleteSearch: false,
        jumpCursorToEnd: true,
        enableAreaCodeStretch: false,
        enableClickOutside: true,
        showDropdown: false,

        defaultErrorMessage: '',

        onEnterKeyPress: null, // null or function

        keys: {
            UP: 38,
            DOWN: 40,
            RIGHT: 39,
            LEFT: 37,
            ENTER: 13,
            ESC: 27,
            PLUS: 43,
            A: 65,
            Z: 90,
            SPACE: 32
        }
    }

    constructor(props) {
        super(props);
        const {onlyCountries, preferredCountries, hiddenAreaCodes} = new CountryData(props.enableAreaCodes, props.enableTerritories, props.regions, props.onlyCountries, props.preferredCountries, props.excludeCountries, props.preserveOrder, props.masks, props.priority, props.areaCodes, props.localization, props.prefix, props.defaultMask, props.alwaysDefaultMask,);

        const inputNumber = props
            .value
            .replace(/\D/g, '') || '';

        let countryGuess;
        if (inputNumber.length > 1) {
            // Country detect by phone
            countryGuess = this.guessSelectedCountry(inputNumber.substring(0, 6), props.country, onlyCountries, hiddenAreaCodes) || 0;
        } else if (props.country) {
            // Default country
            countryGuess = onlyCountries.find(o => o.iso2 == props.country) || 0;
        } else {
            // Empty params
            countryGuess = 0;
        }

        const dialCode = (inputNumber.length < 2 && countryGuess && !startsWith(inputNumber, countryGuess.dialCode))
            ? countryGuess.dialCode
            : '';

        let formattedNumber;
        formattedNumber = (inputNumber === '' && countryGuess === 0)
            ? ''
            : this.formatNumber((props.disableCountryCode
                ? ''
                : dialCode) + inputNumber, countryGuess.name
                ? countryGuess
                : undefined);

        const highlightCountryIndex = onlyCountries.findIndex(o => o == countryGuess);

        this.state = {
            showDropdown: props.showDropdown,

            formattedNumber,
            onlyCountries,
            preferredCountries,
            hiddenAreaCodes,
            selectedCountry: countryGuess,
            highlightCountryIndex,

            queryString: '',
            freezeSelection: false,
            debouncedQueryStingSearcher: debounce(this.searchCountry, 250),
            searchValue: '',

            isShowCountriesModal: false,
        };
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.country !== this.props.country) {
            this.updateCountry(nextProps.country);
        } else if (nextProps.value !== this.props.value) {
            this.updateFormattedNumber(nextProps.value);
        }
    }

    getProbableCandidate = memoize((queryString) => {
        if (!queryString || queryString.length === 0) {
            return null;
        }
        // don't include the preferred countries in search
        const probableCountries = this
            .state
            .onlyCountries
            .filter((country) => {
                return startsWith(country.name.toLowerCase(), queryString.toLowerCase());
            }, this);
        return probableCountries[0];
    });

    guessSelectedCountry = memoize((inputNumber, country, onlyCountries, hiddenAreaCodes) => {
        // if enableAreaCodes == false, try to search in hidden area codes to detect
        // area code correctly then search and insert main country which has this area
        // code https://github.com/bl00mber/react-phone-input-2/issues/201
        if (this.props.enableAreaCodes === false) {
            let mainCode;
            hiddenAreaCodes.some(country => {
                if (startsWith(inputNumber, country.dialCode)) {
                    onlyCountries.some(o => {
                        if (country.iso2 === o.iso2 && o.mainCode) {
                            mainCode = o;
                            return true;
                        }
                    })
                    return true;
                }
            })
            if (mainCode) 
                return mainCode;
            }
        
        const secondBestGuess = onlyCountries.find(o => o.iso2 == country);

        if (inputNumber.trim() === '') 
            return secondBestGuess;
        
        const bestGuess = onlyCountries.reduce((selectedCountry, country) => {
            if (startsWith(inputNumber, country.dialCode)) {
                if (country.dialCode.length > selectedCountry.dialCode.length) {
                    return country;
                }
                if (country.dialCode.length === selectedCountry.dialCode.length && country.priority < selectedCountry.priority) {
                    return country;
                }
            }
            return selectedCountry;
        }, {
            dialCode: '',
            priority: 10001
        }, this);

        if (!bestGuess.name) 
            return secondBestGuess;
        return bestGuess;
    });

    // Hooks for updated props
    updateCountry = (country) => {
        const {onlyCountries} = this.state
        let newSelectedCountry;
        if (country.indexOf(0) >= '0' && country.indexOf(0) <= '9') { // digit
            newSelectedCountry = onlyCountries.find(o => o.dialCode == + country);
        } else {
            newSelectedCountry = onlyCountries.find(o => o.iso2 == country);
        }
        if (newSelectedCountry && newSelectedCountry.dialCode) {
            this.setState({
                selectedCountry: newSelectedCountry,
                formattedNumber: this.props.disableCountryCode
                    ? ''
                    : this.formatNumber(newSelectedCountry.dialCode, newSelectedCountry)
            });
        }
    }

    updateFormattedNumber(value) {
        if (value === null) 
            return this.setState({selectedCountry: 0, formattedNumber: ''});
        
        const {onlyCountries, selectedCountry, hiddenAreaCodes} = this.state;
        const {country, prefix} = this.props;

        if (value === '') 
            return this.setState({selectedCountry, formattedNumber: ''});
        
        let inputNumber = value.replace(/\D/g, '');
        let newSelectedCountry,
            formattedNumber;

        // if new value start with selectedCountry.dialCode, format number, otherwise
        // find newSelectedCountry
        if (selectedCountry && startsWith(value, selectedCountry.dialCode)) {
            formattedNumber = this.formatNumber(inputNumber, selectedCountry);
            this.setState({formattedNumber});
        } else {
            newSelectedCountry = this.guessSelectedCountry(inputNumber.substring(0, 6), country, onlyCountries, hiddenAreaCodes) || selectedCountry;
            const dialCode = newSelectedCountry && startsWith(inputNumber, newSelectedCountry.dialCode)
                ? newSelectedCountry.dialCode
                : '';

            formattedNumber = this.formatNumber((this.props.disableCountryCode
                ? ''
                : dialCode) + inputNumber, newSelectedCountry
                ? (newSelectedCountry)
                : undefined);
            this.setState({selectedCountry: newSelectedCountry, formattedNumber});
        }
    }

    formatNumber = (text, country) => {
        if (!country) 
            return text;
        
        const {format} = country;
        const {disableCountryCode, enableAreaCodeStretch, enableLongNumbers, autoFormat} = this.props;

        let pattern;
        if (disableCountryCode) {
            pattern = format.split(' ');
            pattern.shift();
            pattern = pattern.join(' ');
        } else {
            if (enableAreaCodeStretch && country.isAreaCode) {
                pattern = format.split(' ');
                pattern[1] = pattern[1].replace(/\.+/, ''.padEnd(country.areaCodeLength, '.'))
                pattern = pattern.join(' ');
            } else {
                pattern = format;
            }
        }

        if (!text || text.length === 0) {
            return disableCountryCode
                ? ''
                : this.props.prefix;
        }

        // for all strings with length less than 3, just return it (1, 2 etc.) also
        // return the same text if the selected country has no fixed format
        if ((text && text.length < 2) || !pattern || !autoFormat) {
            return disableCountryCode
                ? text
                : this.props.prefix + text;
        }

        const formattedObject = reduce(pattern, (acc, character) => {
            if (acc.remainingText.length === 0) {
                return acc;
            }

            if (character !== '.') {
                return {
                    formattedText: acc.formattedText + character,
                    remainingText: acc.remainingText
                };
            }

            const [head,
                ...tail] = acc.remainingText;

            return {
                formattedText: acc.formattedText + head,
                remainingText: tail
            };
        }, {
            formattedText: '',
            remainingText: text.split('')
        });

        let formattedNumber;
        if (enableLongNumbers) {
            formattedNumber = formattedObject.formattedText + formattedObject
                .remainingText
                .join('');
        } else {
            formattedNumber = formattedObject.formattedText;
        }

        // Always close brackets
        // if (formattedNumber.includes('(') && !formattedNumber.includes(')')) 
        //     formattedNumber += ')';

        if(!formattedNumber.startsWith(this.props.prefix + country.dialCode)) {
           formattedNumber = this.props.prefix + country.dialCode + formattedNumber.replace(this.props.prefix, '');
        }
        return formattedNumber;
    }

    // Put the cursor to the end of the input (usually after a focus event)
    cursorToEnd = () => {
        // const input = this.numberInputRef; input.focus(); let len =
        // input.value.length; if (input.value.charAt(len-1)=== ')') len = len-1;
        // input.setSelectionRange(len, len);
    }

    getElement = (index) => {
        return this[`flag_no_${index}`];
    }

    // return country data from state
    getCountryData = () => {
        if (!this.state.selectedCountry) 
            return {}
        return {
            name: this.state.selectedCountry.name || '',
            dialCode: this.state.selectedCountry.dialCode || '',
            countryCode: this.state.selectedCountry.iso2 || '',
            format: this.state.selectedCountry.format || ''
        }
    }

    handleFlagDropdownClick = () => {
        if (!this.state.showDropdown && this.props.disabled) 
            return;
        const {preferredCountries, selectedCountry} = this.state
        const allCountries = preferredCountries.concat(this.state.onlyCountries)

        const highlightCountryIndex = allCountries.findIndex(o => o.dialCode === selectedCountry.dialCode && o.iso2 === selectedCountry.iso2);

        this.setState({
            showDropdown: !this.state.showDropdown,
            highlightCountryIndex
        }, () => {
            if (this.state.showDropdown) {
                this.scrollTo(this.getElement(this.state.highlightCountryIndex));
            }
        });
    }

    handleInput = (value) => {
        // const { value } = e.target;
        const {prefix} = this.props;

        if (value === prefix) 
            return this.setState({formattedNumber: ''});
        
        let formattedNumber = this.props.disableCountryCode
            ? ''
            : prefix;
        let newSelectedCountry = this.state.selectedCountry;
        let freezeSelection = this.state.freezeSelection;

        if (!this.props.countryCodeEditable) {
            const mainCode = newSelectedCountry.hasAreaCodes
                ? this
                    .state
                    .onlyCountries
                    .find(o => o.iso2 === newSelectedCountry.iso2 && o.mainCode)
                    .dialCode
                : newSelectedCountry.dialCode;

            const updatedInput = prefix + mainCode;
            if (value.slice(0, updatedInput.length) !== updatedInput) 
                return;
            }
        
        // Does not exceed 15 digit phone number limit
        if (value.replace(/\D/g, '').length > 15) 
            return;
        
        // if the input is the same as before, must be some special key like enter etc.
        if (value === this.state.formattedNumber) 
            return;
        
        // ie hack if (e.preventDefault) {   e.preventDefault(); } else {
        // e.returnValue = false; }

        const {country, onChange} = this.props
        const {onlyCountries, selectedCountry, hiddenAreaCodes} = this.state
        
        if (value.length > 0) {
            // before entering the number in new format, lets check if the dial code now
            // matches some other country
            const inputNumber = value.replace(/\D/g, '');

            // we don't need to send the whole number to guess the country... only the first
            // 6 characters are enough the guess country function can then use memoization
            // much more effectively since the set of input it gets has drastically reduced
            if (!this.state.freezeSelection || selectedCountry.dialCode.length > inputNumber.length) {
                newSelectedCountry = this.guessSelectedCountry(inputNumber.substring(0, 6), country, onlyCountries, hiddenAreaCodes) || selectedCountry;
                freezeSelection = false;
            }
            formattedNumber = this.formatNumber(inputNumber, newSelectedCountry);


            newSelectedCountry = newSelectedCountry.dialCode
                ? newSelectedCountry
                : selectedCountry;
        }

        // let caretPosition = e.target.selectionStart;
        const oldFormattedText = this.state.formattedNumber;
        const diff = formattedNumber.length - oldFormattedText.length;

        this.setState({
            formattedNumber,
            freezeSelection,
            selectedCountry: newSelectedCountry
        }, () => {

            if (onChange) 
                onChange(this.props.prefix + formattedNumber.replace(/[^0-9]+/g, ''), this.getCountryData(), value, formattedNumber);
            }
        );
    }

    handleFlagItemClick = (country, e) => {
        const currentSelectedCountry = this.state.selectedCountry;
        const newSelectedCountry = this
            .state
            .onlyCountries
            .find(o => o == country);
        if (!newSelectedCountry) 
            return;
        
        const unformattedNumber = this
            .state
            .formattedNumber
            .replace(' ', '')
            .replace('(', '')
            .replace(')', '')
            .replace('-', '');
        const newNumber = unformattedNumber.length > 1
            ? unformattedNumber.replace(currentSelectedCountry.dialCode, newSelectedCountry.dialCode)
            : newSelectedCountry.dialCode;
        const formattedNumber = this.formatNumber(newNumber.replace(/\D/g, ''), newSelectedCountry);

        this.setState({
            showDropdown: false,
            selectedCountry: newSelectedCountry,
            freezeSelection: true,
            formattedNumber,
            isShowCountriesModal: false
        }, () => {
            this.cursorToEnd();
            if (this.props.onChange) 
                this.props.onChange(formattedNumber.replace(/[^0-9]+/g, ''), this.getCountryData(), e, this.props.prefix + formattedNumber);
            }
        );
    }

    handleInputFocus = (e) => {
        // if the input is blank, insert dial code of the selected country
        if (this.numberInputRef) {
            if (this.numberInputRef.value === this.props.prefix && this.state.selectedCountry && !this.props.disableCountryCode) {
                this.setState({
                    formattedNumber: this.props.prefix + this.state.selectedCountry.dialCode
                }, () => {
                    this.props.jumpCursorToEnd && setTimeout(this.cursorToEnd, 0)
                });
            }
        }

        this.setState({placeholder: ''});

        this.props.onFocus && this
            .props
            .onFocus(e, this.getCountryData());
        this.props.jumpCursorToEnd && setTimeout(this.cursorToEnd, 0);
    }

    handleInputBlur = (e) => {
        if (!e.target.value) 
            this.setState({placeholder: this.props.placeholder});
        this.props.onBlur && this
            .props
            .onBlur(e, this.getCountryData());
    }

    handleInputCopy = (e) => {
        if (!this.props.copyNumbersOnly) 
            return;
        const text = window
            .getSelection()
            .toString()
            .replace(/[^0-9]+/g, '');
        e
            .clipboardData
            .setData('text/plain', text);
        e.preventDefault();
    }

    onEndEditing = (e) => {
      if(this.props.onEndEditing) {
        const {dialCode, format, name} = this.state.selectedCountry;

        this.props.onEndEditing(e, {
          countryCode: this.state.selectedCountry.iso2,
          dialCode,
          format,
          name
        });
      }
    }

    getHighlightCountryIndex = (direction) => {
        // had to write own function because underscore does not have findIndex. lodash
        // has it
        const highlightCountryIndex = this.state.highlightCountryIndex + direction;

        if (highlightCountryIndex < 0 || highlightCountryIndex >= (this.state.onlyCountries.length + this.state.preferredCountries.length)) {
            return highlightCountryIndex - direction;
        }

        if (this.props.enableSearch && highlightCountryIndex > this.getSearchFilteredCountries().length) 
            return 0; // select first country
        return highlightCountryIndex;
    }

    searchCountry = () => {
        const probableCandidate = this.getProbableCandidate(this.state.queryString) || this.state.onlyCountries[0];
        const probableCandidateIndex = this
            .state
            .onlyCountries
            .findIndex(o => o == probableCandidate) + this.state.preferredCountries.length;

        this.scrollTo(this.getElement(probableCandidateIndex), true);

        this.setState({queryString: '', highlightCountryIndex: probableCandidateIndex});
    }
    
    handleClickOutside = (e) => {
        if (this.dropdownRef && !this.dropdownContainerRef.contains(e.target)) {
            this.state.showDropdown && this.setState({showDropdown: false});
        }
    }

    handleSearchChange = (searchValue) => {
        
        const {preferredCountries, selectedCountry} = this.state
        let highlightCountryIndex = 0;

        if (searchValue === '' && selectedCountry) {
            const {onlyCountries} = this.state
            highlightCountryIndex = preferredCountries
                .concat(onlyCountries)
                .findIndex(o => o == selectedCountry);
        }
        this.setState({searchValue, highlightCountryIndex});
    }

    getDropdownCountryName = (country) => {
        return country.localName || country.name;
    }

    getSearchFilteredCountries = () => {
        const {preferredCountries, onlyCountries, searchValue} = this.state
        const allCountries = preferredCountries.concat(onlyCountries);
        const sanitizedSearchValue = searchValue
            .trim()
            .toLowerCase();
        if (sanitizedSearchValue) {
            // [...new Set()] to get rid of duplicates firstly search by iso2 code
            if (/^\d+$/.test(sanitizedSearchValue)) { // contains digits only
                // values wrapped in ${} to prevent undefined
                return allCountries.filter(({dialCode}) => [`${dialCode}`].some(field => field.toLowerCase().includes(sanitizedSearchValue)))
            } else {
                const iso2countries = allCountries.filter(({iso2}) => [`${iso2}`].some(field => field.toLowerCase().includes(sanitizedSearchValue)))
                const searchedCountries = allCountries.filter(({name, localName, iso2}) => [`${name}`, `${localName}`].some(field => field.toLowerCase().includes(sanitizedSearchValue)))
     
                return [...new Set([].concat(iso2countries, searchedCountries))]
            }
        } else {
            return allCountries
        }
    }

    getCountryDropdownList = () => {
        const {preferredCountries, searchValue} = this.state;
        const { prefix} = this.props
        const {
            enableSearch,
            searchNotFound,
        } = this.props;

        const searchedCountries = this.getSearchFilteredCountries()

        let countryDropdownList = searchedCountries.map((country, index) => {
            return (
                <TouchableOpacity
                    ref={el => this[`flag_no_${index}`] = el}
                    key={`flag_no_${index}`}
                    onPress={(e) => this.handleFlagItemClick(country, e)}>
                    <View style={styles.modal_option}>
                        <View
                            style={{
                            width: 23,
                            height: 20,
                            overflow: 'hidden'
                        }}>
                            {FLAG_IMAGE_POSITION[country.iso2]
                                ? <Image
                                        source={require('./style/common/high-res.png')}
                                        style={{
                                        width: 408,
                                        height: 384,
                                        position: 'absolute',
                                        left: -1 * FLAG_IMAGE_POSITION[country.iso2].x,
                                        top: -1 * FLAG_IMAGE_POSITION[country.iso2].y
                                    }}/>
                                : null}
                        </View>

                        <Text style={[styles.option_country_name, this.props.countryNameStyle]}>{this.getDropdownCountryName(country)}</Text>
                        <Text style={[styles.option_dial_code, this.props.countryDialCodeStyle]}>{country.format
                                ? this.formatNumber(country.dialCode, country)
                                : (prefix + country.dialCode)}</Text>
                    </View>
                </TouchableOpacity>
            );
        });

        const divider = (<View style={styles.divider}/>);
        // let's insert a dashed line in between preferred countries and the rest
        (preferredCountries.length > 0) && (!enableSearch || enableSearch && !searchValue.trim()) && countryDropdownList.splice(preferredCountries.length, 0, divider);

        return (
            <View>
                {countryDropdownList.length > 0
                    ? countryDropdownList
                    : (
                        <View>
                            <Text>{searchNotFound}</Text>
                        </View>
                    )}
            </View>
        );
    }

    showCountriesModal = () => {
        this.setState({isShowCountriesModal: true})
    }

    _onCloseCountriesModal = () => {
        this.setState({isShowCountriesModal: false})
    }

    render() {

        const {onlyCountries, selectedCountry, showDropdown, formattedNumber, hiddenAreaCodes} = this.state;
        const {isValid, defaultErrorMessage, isDebug, modalRootStyle} = this.props;

        let errorMessage;
            if(isValid) {
              const isValidValue = isValid(formattedNumber.replace(/\D/g, ''), selectedCountry, onlyCountries, hiddenAreaCodes);

              if (isValidValue === false) {
                  errorMessage = defaultErrorMessage
              }
            }

        return (
            <View
                style={[
                styles.container, this.props.style || this.props.containerStyle
            ]}>
                <View style={styles.row}>
                    {errorMessage && <View >
                        <Text>{errorMessage}</Text>
                    </View>}

                    <TouchableOpacity onPress={this.showCountriesModal} style={[styles.buttonStyle, this.props.buttonStyle]}>
                        <View
                            style={{
                            width: 23,
                            height: 20,
                            overflow: 'hidden'
                        }}>
                            {selectedCountry && FLAG_IMAGE_POSITION[selectedCountry.iso2]
                                ? <Image
                                        source={require('./style/common/high-res.png')}
                                        style={{
                                        width: 408,
                                        height: 384,
                                        position: 'absolute',
                                        left: -1 * FLAG_IMAGE_POSITION[selectedCountry.iso2].x,
                                        top: -1 * FLAG_IMAGE_POSITION[selectedCountry.iso2].y
                                    }}/>
                                : null}
                        </View>
                        <View style={this.state.isShowCountriesModal ? styles.activeTriangleContainer : styles.triangleContainer}><View style={[styles.triangle, {borderTopColor: this.props.arrowColor}]}/></View>
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, this.props.inputStyle]}
                        maxLength={selectedCountry.format.length}
                        onChangeText={this.handleInput}
                        onFocus={this.handleInputFocus}
                        onBlur={this.handleInputBlur}
                        onCopy={this.handleInputCopy}
                        onEndEditing={this.onEndEditing}
                        value={formattedNumber}
                        ref={el => this.numberInputRef = el}
                        onKeyPress={this.handleInputKeyDown}
                        placeholder={this.props.placeholder}
                        keyboardType='phone-pad'
                        returnKeyType='done'
                        placeholderTextColor='#444'
                        {...this.props.inputProps}/>
                </View>

                {isDebug ? <Text>{selectedCountry
                        ? `${selectedCountry.name}: + ${selectedCountry.dialCode}, country_code: ${selectedCountry.countryCode}`
                        : ''} {JSON.stringify(selectedCountry)}</Text> : null}

                <Modal
                    visible={this.state.isShowCountriesModal}
                    onRequestClose={this._onCloseCountriesModal}>
                        <View style={[styles.modal, modalRootStyle]}>
                            <View style={styles.modal_content}>
                              {this.props.showSearchInput ?                         
                                <View style={styles.modal_search_box}>
                                    <TextInput style={styles.modal_search_input} underlineColorAndroid='transparent' placeholder='Search country...' value={this.state.searchValue} onChangeText={this.handleSearchChange} placeholderTextColor='#666' />
                                    <TouchableOpacity style={styles.modal_btn_search} onPress={this.doSearch}>
                                        <Text>Search</Text>
                                    </TouchableOpacity>
                                </View> : null}
                                <View style={{flex: 1}}>
                                    <ScrollView>
                                        <View style={styles.modal_list}>
                                            {this.getCountryDropdownList()}
                                        </View>
                                    </ScrollView>
                                </View>
                                <View style={styles.modal_control}>
                                    <TouchableOpacity onPress={this._onCloseCountriesModal}>
                                        <View style={styles.modal_btn_close}>
                                            <Text style={this.props.cancelButtonStyle}>{this.props.cancelButtonText}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                </Modal>
            </View>
        );
    }
}

export default PhoneInput;

const triangleContainerBase = {
    height: 8,
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    paddingTop: 2,
};

var styles = StyleSheet.create({
    container: {},
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        color: '#222',
        marginLeft: 8
    },
    modal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 16
    },
    modal_content: {
        backgroundColor: '#fff',
        flex: 1,
    },
    modal_option: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: 16
    },
    modal_list: {
        paddingVertical: 16
    },
    divider: {
       width: '100%',
       marginVertical: 5,
       borderWidth: 0.5,
       borderColor: '#70544F',
    },
    option_country_name: {
        flex: 1,
        marginLeft: 8, 
        marginRight: 8
    },
    modal_control: {
        padding: 16,
        flexDirection: 'row-reverse',
        height: 48,
    },
    modal_btn_close: {
        paddingLeft: 16,
    },
    modal_search_box: {
        paddingLeft: 16,
        paddingRight: 16,
        borderWidth: 1,
        borderColor: '#999',
        flexDirection: 'row',
        height: 40,
        borderRadius: 20,
        margin: 16,
    },
    modal_search_input: {
        padding: 0,
        flex: 1,
        color: '#222'
    },
    modal_btn_search: {
        alignItems: 'center',
        justifyContent: 'center',
        alignContent: 'center'
    },
    triangleContainer: {
        ...triangleContainerBase,
    },
    activeTriangleContainer: {
        ...triangleContainerBase,
        transform: [{ rotateX: '180deg' }]
    },
    triangle: {
        width: 10,
        height: 6,
        borderBottomWidth: 0,
        borderRightWidth: 5,
        borderLeftWidth: 5,
        borderTopWidth: 6,
        borderColor: 'transparent',
    },
    buttonStyle: {
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 8,
    }
})