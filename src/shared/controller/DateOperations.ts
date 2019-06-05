export default class dateoperations {
    private today: Date;
    private _startDate: any;
    private _nextDate: any;

    constructor() {
        //this._startDate = new Date(startDate);
        //this._nextDate = new Date(startDate);
        this.today = new Date();
    }

    get todayDate() {
        return this.today;
    }

    get currentDatetime() {
        let date = this.today.getFullYear() + '-' + (this.today.getMonth() + 1) + '-' + this.today.getDate();
        let time = this.today.getHours() + ":" + this.today.getMinutes() + ":" + this.today.getSeconds();
        return date + " " + time;
    }

    get startDate() {
        return this._startDate;
    }

    get nextDate() {
        return this._nextDate;
    }

    todayStringDateTime() {
        return this.getStringDateTime(this.getStringDate(this.todayDate));
    }

    getStringDateTime(d) {
        return new Date(d);
    }
    getParseDate(d) {
        return (d.getDate() < 10 ? '0' : '') + d.getDate();
    }

    getParseMonth(d) {
        return (d.getMonth() < 10 ? '0' : '') + (d.getMonth() + 1);
    }

    getParseFullYear(d) {
        return d.getFullYear();
    }

    getStringDate(d) {
        return `${this.getParseFullYear(d)}-${this.getParseMonth(d)}-${this.getParseDate(d)}`;
    }

    isToday(d) {
        return d.getTime() === this.todayStringDateTime().getTime();
    }

    isPastDate(d) {
        return d.getTime() < this.todayStringDateTime().getTime();
    }

    isStartDate() {
        return this._nextDate.getTime() === this._startDate.getTime();
    }

    // updatedStartDate() {
    //     this._nextDate.setDate(this._startDate.getDate() + 1);
    // }

    updatedStartDate(d) {
        return d.setDate(d.getDate() + 1);
    }

    nextDateTime() {
        return this._nextDate.setDate(this._startDate.getDate() + 1);
    }

    getMonthName(month) {
        let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return months[month] || null;
    }

    getCriteriaDate(d) {
        return `${this.getMonthName(d.getMonth())} ${this.getParseDate(d)}, ${this.getParseFullYear(d)}`;
    }

    getCustomStringDate(d, concatString) {
        const dateData = [this.getParseFullYear(d), this.getParseMonth(d), this.getParseDate(d)];
        return dateData.join(concatString);
    }
}